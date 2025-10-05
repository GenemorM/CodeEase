using System.Text;
using System.Text.Json;

namespace CodeEase.Services
{
    public class CodeRunnerService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<CodeRunnerService> _logger;
        private readonly string _codeRunnerBaseUrl;

        public CodeRunnerService(HttpClient httpClient, IConfiguration configuration, ILogger<CodeRunnerService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _codeRunnerBaseUrl = configuration["CodeRunner:BaseUrl"] ?? "http://localhost:3001";
            
            // Configure HttpClient
            _httpClient.BaseAddress = new Uri(_codeRunnerBaseUrl);
            _httpClient.Timeout = TimeSpan.FromSeconds(60); // Allow up to 60 seconds for code execution
        }

        public async Task<CodeExecutionResult> ExecuteCodeAsync(CodeExecutionRequest request)
        {
            try
            {
                _logger.LogInformation("Executing code for language: {Language}", request.Language);

                var json = JsonSerializer.Serialize(new
                {
                    code = request.Code,
                    language = request.Language.ToLower(),
                    input = request.Input ?? string.Empty,
                    timeout = request.Timeout ?? 30000
                });

                var content = new StringContent(json, Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync("/execute", content);

                var responseContent = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    var result = JsonSerializer.Deserialize<CodeRunnerResponse>(responseContent, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });

                    return new CodeExecutionResult
                    {
                        Success = result?.Success ?? false,
                        Output = result?.Output ?? string.Empty,
                        Error = result?.Error ?? string.Empty,
                        ExecutionTime = result?.ExecutionTime ?? 0,
                        ExitCode = result?.ExitCode ?? -1,
                        ExecutionId = result?.ExecutionId ?? string.Empty,
                        Language = result?.Language ?? request.Language
                    };
                }
                else
                {
                    _logger.LogError("Code execution failed with status: {StatusCode}, Response: {Response}", 
                        response.StatusCode, responseContent);

                    return new CodeExecutionResult
                    {
                        Success = false,
                        Error = $"Code execution service error: {response.StatusCode}",
                        Output = string.Empty,
                        ExecutionTime = 0,
                        ExitCode = -1,
                        ExecutionId = string.Empty,
                        Language = request.Language
                    };
                }
            }
            catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException)
            {
                _logger.LogError(ex, "Code execution timed out");
                return new CodeExecutionResult
                {
                    Success = false,
                    Error = "Code execution timed out",
                    Output = string.Empty,
                    ExecutionTime = 0,
                    ExitCode = -1,
                    ExecutionId = string.Empty,
                    Language = request.Language
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing code");
                return new CodeExecutionResult
                {
                    Success = false,
                    Error = "Internal error during code execution",
                    Output = string.Empty,
                    ExecutionTime = 0,
                    ExitCode = -1,
                    ExecutionId = string.Empty,
                    Language = request.Language
                };
            }
        }

        public async Task<List<SupportedLanguage>> GetSupportedLanguagesAsync()
        {
            try
            {
                var response = await _httpClient.GetAsync("/languages");
                
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    var result = JsonSerializer.Deserialize<LanguagesResponse>(content, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });

                    return result?.Languages ?? new List<SupportedLanguage>();
                }
                else
                {
                    _logger.LogError("Failed to get supported languages: {StatusCode}", response.StatusCode);
                    return GetDefaultSupportedLanguages();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting supported languages");
                return GetDefaultSupportedLanguages();
            }
        }

        public async Task<bool> IsHealthyAsync()
        {
            try
            {
                var response = await _httpClient.GetAsync("/health");
                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Health check failed for code runner service");
                return false;
            }
        }

        private static List<SupportedLanguage> GetDefaultSupportedLanguages()
        {
            return new List<SupportedLanguage>
            {
                new() { Name = "java", DisplayName = "Java", Extension = ".java", Timeout = 30000 },
                new() { Name = "csharp", DisplayName = "C#", Extension = ".cs", Timeout = 30000 },
                new() { Name = "javascript", DisplayName = "JavaScript", Extension = ".js", Timeout = 30000 },
                new() { Name = "python", DisplayName = "Python", Extension = ".py", Timeout = 30000 }
            };
        }
    }

    // Request/Response DTOs
    public class CodeExecutionRequest
    {
        public string Code { get; set; } = string.Empty;
        public string Language { get; set; } = string.Empty;
        public string? Input { get; set; }
        public int? Timeout { get; set; }
    }

    public class CodeExecutionResult
    {
        public bool Success { get; set; }
        public string Output { get; set; } = string.Empty;
        public string Error { get; set; } = string.Empty;
        public int ExecutionTime { get; set; }
        public int ExitCode { get; set; }
        public string ExecutionId { get; set; } = string.Empty;
        public string Language { get; set; } = string.Empty;
    }

    public class SupportedLanguage
    {
        public string Name { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Extension { get; set; } = string.Empty;
        public int Timeout { get; set; }
    }

    // Internal DTOs for API communication
    internal class CodeRunnerResponse
    {
        public bool Success { get; set; }
        public string Output { get; set; } = string.Empty;
        public string Error { get; set; } = string.Empty;
        public int ExecutionTime { get; set; }
        public int ExitCode { get; set; }
        public string ExecutionId { get; set; } = string.Empty;
        public string Language { get; set; } = string.Empty;
    }

    internal class LanguagesResponse
    {
        public bool Success { get; set; }
        public List<SupportedLanguage> Languages { get; set; } = new();
    }
}