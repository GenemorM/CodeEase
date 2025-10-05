using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using CodeEase.Services;

namespace CodeEase.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CodeRunnerController : ControllerBase
    {
        private readonly CodeRunnerService _codeRunnerService;
        private readonly ILogger<CodeRunnerController> _logger;

        public CodeRunnerController(CodeRunnerService codeRunnerService, ILogger<CodeRunnerController> logger)
        {
            _codeRunnerService = codeRunnerService;
            _logger = logger;
        }

        [HttpPost("execute")]
        public async Task<ActionResult<CodeExecutionResult>> ExecuteCode([FromBody] CodeExecutionRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (string.IsNullOrWhiteSpace(request.Code))
            {
                return BadRequest(new { message = "Code is required" });
            }

            if (string.IsNullOrWhiteSpace(request.Language))
            {
                return BadRequest(new { message = "Language is required" });
            }

            try
            {
                var result = await _codeRunnerService.ExecuteCodeAsync(request);
                
                if (result.Success)
                {
                    return Ok(result);
                }
                else
                {
                    return BadRequest(result);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing code");
                return StatusCode(500, new { message = "Internal server error during code execution" });
            }
        }

        [HttpGet("languages")]
        public async Task<ActionResult<List<SupportedLanguage>>> GetSupportedLanguages()
        {
            try
            {
                var languages = await _codeRunnerService.GetSupportedLanguagesAsync();
                return Ok(languages);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting supported languages");
                return StatusCode(500, new { message = "Error retrieving supported languages" });
            }
        }

        [HttpGet("health")]
        public async Task<ActionResult> CheckHealth()
        {
            try
            {
                var isHealthy = await _codeRunnerService.IsHealthyAsync();
                
                if (isHealthy)
                {
                    return Ok(new { status = "healthy", service = "code-runner" });
                }
                else
                {
                    return ServiceUnavailable(new { status = "unhealthy", service = "code-runner" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking code runner health");
                return ServiceUnavailable(new { status = "error", service = "code-runner", message = "Health check failed" });
            }
        }

        [HttpPost("validate")]
        public async Task<ActionResult> ValidateCode([FromBody] CodeValidationRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Code))
            {
                return BadRequest(new { message = "Code is required" });
            }

            if (string.IsNullOrWhiteSpace(request.Language))
            {
                return BadRequest(new { message = "Language is required" });
            }

            try
            {
                // For validation, we'll do a quick syntax check by trying to compile/run
                var executionRequest = new CodeExecutionRequest
                {
                    Code = request.Code,
                    Language = request.Language,
                    Input = string.Empty,
                    Timeout = 10000 // Shorter timeout for validation
                };

                var result = await _codeRunnerService.ExecuteCodeAsync(executionRequest);

                var validation = new CodeValidationResult
                {
                    IsValid = result.Success && result.ExitCode == 0,
                    HasSyntaxErrors = !string.IsNullOrEmpty(result.Error) && result.Error.Contains("error"),
                    HasRuntimeErrors = result.ExitCode != 0 && result.Success,
                    ErrorMessage = result.Error,
                    Language = request.Language,
                    ExecutionTime = result.ExecutionTime
                };

                return Ok(validation);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating code");
                return StatusCode(500, new { message = "Error during code validation" });
            }
        }

        private ActionResult ServiceUnavailable(object value)
        {
            return StatusCode(503, value);
        }
    }

    // Additional DTOs
    public class CodeValidationRequest
    {
        public string Code { get; set; } = string.Empty;
        public string Language { get; set; } = string.Empty;
    }

    public class CodeValidationResult
    {
        public bool IsValid { get; set; }
        public bool HasSyntaxErrors { get; set; }
        public bool HasRuntimeErrors { get; set; }
        public string ErrorMessage { get; set; } = string.Empty;
        public string Language { get; set; } = string.Empty;
        public int ExecutionTime { get; set; }
    }
}