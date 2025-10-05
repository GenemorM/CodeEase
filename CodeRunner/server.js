const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');
const path = require('path');
const Docker = require('dockerode');

const app = express();
const PORT = process.env.PORT || 3001;
const docker = new Docker();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Directories for temporary files
const TEMP_DIR = path.join(__dirname, 'temp');
const DOCKER_TIMEOUT = 30000; // 30 seconds

// Ensure temp directory exists
fs.ensureDirSync(TEMP_DIR);

// Supported languages configuration
const LANGUAGE_CONFIG = {
    java: {
        extension: '.java',
        dockerImage: 'openjdk:11-jdk-slim',
        compileCommand: (filename) => `javac ${filename}`,
        runCommand: (classname) => `java ${classname}`,
        timeout: 30000
    },
    csharp: {
        extension: '.cs',
        dockerImage: 'mcr.microsoft.com/dotnet/sdk:8.0',
        compileCommand: (filename) => `csc ${filename}`,
        runCommand: (filename) => `mono ${filename.replace('.cs', '.exe')}`,
        timeout: 30000
    },
    javascript: {
        extension: '.js',
        dockerImage: 'node:18-alpine',
        runCommand: (filename) => `node ${filename}`,
        timeout: 30000
    },
    python: {
        extension: '.py',
        dockerImage: 'python:3.9-alpine',
        runCommand: (filename) => `python ${filename}`,
        timeout: 30000
    }
};

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'CodeEase Code Runner'
    });
});

// Main code execution endpoint
app.post('/execute', async (req, res) => {
    const executionId = uuidv4();
    const startTime = Date.now();
    
    try {
        const { code, language, input = '', timeout = 30000 } = req.body;
        
        // Validate input
        if (!code || !language) {
            return res.status(400).json({
                success: false,
                error: 'Code and language are required',
                executionId
            });
        }
        
        if (!LANGUAGE_CONFIG[language.toLowerCase()]) {
            return res.status(400).json({
                success: false,
                error: `Unsupported language: ${language}`,
                executionId,
                supportedLanguages: Object.keys(LANGUAGE_CONFIG)
            });
        }
        
        const config = LANGUAGE_CONFIG[language.toLowerCase()];
        const result = await executeCode(code, config, input, Math.min(timeout, DOCKER_TIMEOUT), executionId);
        
        const executionTime = Date.now() - startTime;
        
        res.json({
            success: true,
            executionId,
            language,
            executionTime,
            ...result
        });
        
    } catch (error) {
        console.error(`Execution error [${executionId}]:`, error);
        
        const executionTime = Date.now() - startTime;
        
        res.status(500).json({
            success: false,
            error: 'Internal server error during code execution',
            executionId,
            executionTime,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Code execution function with Docker isolation
async function executeCode(code, config, input, timeout, executionId) {
    const workDir = path.join(TEMP_DIR, executionId);
    
    try {
        // Create working directory
        await fs.ensureDir(workDir);
        
        // Determine filename
        let filename;
        if (config.extension === '.java') {
            // Extract class name from Java code
            const classMatch = code.match(/public\s+class\s+(\w+)/);
            const className = classMatch ? classMatch[1] : 'Main';
            filename = `${className}${config.extension}`;
        } else {
            filename = `code${config.extension}`;
        }
        
        const filePath = path.join(workDir, filename);
        
        // Write code to file
        await fs.writeFile(filePath, code);
        
        // Create input file if provided
        if (input) {
            await fs.writeFile(path.join(workDir, 'input.txt'), input);
        }
        
        // Execute in Docker container
        const result = await runInDocker(config, workDir, filename, timeout);
        
        return result;
        
    } finally {
        // Cleanup: Remove temporary directory
        try {
            await fs.remove(workDir);
        } catch (cleanupError) {
            console.error(`Cleanup error [${executionId}]:`, cleanupError);
        }
    }
}

// Docker execution function
async function runInDocker(config, workDir, filename, timeout) {
    return new Promise(async (resolve, reject) => {
        let container;
        let timeoutHandle;
        
        try {
            // Prepare Docker run options
            const containerOptions = {
                Image: config.dockerImage,
                WorkingDir: '/workspace',
                Cmd: ['/bin/sh', '-c', buildExecutionCommand(config, filename)],
                HostConfig: {
                    Binds: [`${workDir}:/workspace`],
                    Memory: 128 * 1024 * 1024, // 128MB memory limit
                    CpuQuota: 50000, // 50% CPU limit
                    NetworkMode: 'none', // No network access
                    ReadonlyRootfs: false,
                    AutoRemove: true
                },
                AttachStdout: true,
                AttachStderr: true
            };
            
            // Create and start container
            container = await docker.createContainer(containerOptions);
            
            // Set timeout
            timeoutHandle = setTimeout(async () => {
                try {
                    if (container) {
                        await container.kill();
                    }
                } catch (killError) {
                    console.error('Error killing container:', killError);
                }
                reject(new Error('Execution timeout'));
            }, timeout);
            
            // Start container and get output
            const stream = await container.attach({
                stream: true,
                stdout: true,
                stderr: true
            });
            
            await container.start();
            
            // Collect output
            let output = '';
            let error = '';
            
            stream.on('data', (chunk) => {
                const data = chunk.toString();
                if (chunk[0] === 1) { // stdout
                    output += data.slice(8); // Remove Docker stream header
                } else if (chunk[0] === 2) { // stderr
                    error += data.slice(8); // Remove Docker stream header
                }
            });
            
            // Wait for container to finish
            const result = await container.wait();
            
            clearTimeout(timeoutHandle);
            
            resolve({
                output: output.trim(),
                error: error.trim(),
                exitCode: result.StatusCode,
                success: result.StatusCode === 0
            });
            
        } catch (dockerError) {
            clearTimeout(timeoutHandle);
            
            if (container) {
                try {
                    await container.remove({ force: true });
                } catch (removeError) {
                    console.error('Error removing container:', removeError);
                }
            }
            
            reject(dockerError);
        }
    });
}

// Build execution command based on language
function buildExecutionCommand(config, filename) {
    let command = '';
    
    if (config.compileCommand) {
        // Languages that need compilation (Java, C#)
        const compileCmd = config.compileCommand(filename);
        const runCmd = config.runCommand(filename.replace(config.extension, ''));
        command = `${compileCmd} && ${runCmd}`;
    } else {
        // Interpreted languages (JavaScript, Python)
        command = config.runCommand(filename);
    }
    
    // Add input redirection if input file exists
    command += ' < input.txt 2>&1 || echo ""; echo "Exit code: $?"';
    
    return command;
}

// Get supported languages
app.get('/languages', (req, res) => {
    const languages = Object.keys(LANGUAGE_CONFIG).map(lang => ({
        name: lang,
        displayName: lang.charAt(0).toUpperCase() + lang.slice(1),
        extension: LANGUAGE_CONFIG[lang].extension,
        timeout: LANGUAGE_CONFIG[lang].timeout
    }));
    
    res.json({
        success: true,
        languages
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        availableEndpoints: [
            'GET /health',
            'GET /languages', 
            'POST /execute'
        ]
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 CodeEase Code Runner Service started on port ${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 Supported languages: http://localhost:${PORT}/languages`);
    console.log(`⚡ Execute endpoint: POST http://localhost:${PORT}/execute`);
});

module.exports = app;