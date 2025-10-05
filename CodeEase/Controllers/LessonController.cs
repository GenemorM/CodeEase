using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using CodeEase.Data;
using CodeEase.Models;
using CodeEase.Services;

namespace CodeEase.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LessonController : ControllerBase
    {
        private readonly CodeEaseDbContext _context;
        private readonly GeminiService _geminiService;
        private readonly ILogger<LessonController> _logger;

        public LessonController(CodeEaseDbContext context, GeminiService geminiService, ILogger<LessonController> logger)
        {
            _context = context;
            _geminiService = geminiService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Lesson>>> GetLessons()
        {
            var lessons = await _context.Lessons
                .Where(l => l.IsPublished)
                .OrderBy(l => l.OrderIndex)
                .ToListAsync();

            return Ok(lessons);
        }

        [HttpGet("recent")]
        public async Task<ActionResult<IEnumerable<object>>> GetRecentLessons()
        {
            try
            {
                // Check if user is authenticated
                if (User.Identity?.IsAuthenticated == true)
                {
                    var userId = GetCurrentUserId();
                    
                    // Get recent lessons based on user progress
                    var recentLessons = await _context.StudentProgresses
                        .Include(sp => sp.Lesson)
                        .Where(sp => sp.UserId == userId)
                        .OrderByDescending(sp => sp.LastAccessedAt)
                        .Take(5)
                        .Select(sp => new
                        {
                            id = sp.Lesson.Id,
                            title = sp.Lesson.Title,
                            description = sp.Lesson.Description,
                            difficulty = sp.Lesson.Difficulty.ToString(),
                            updatedAt = sp.LastAccessedAt,
                            progress = sp.Status == ProgressStatus.Completed ? 100 : 
                                      sp.Status == ProgressStatus.InProgress ? 50 : 0
                        })
                        .ToListAsync();

                    if (recentLessons.Any())
                    {
                        return Ok(recentLessons);
                    }
                }

                // For unauthenticated users or users with no progress, return some published lessons
                var publishedLessons = await _context.Lessons
                    .Where(l => l.IsPublished)
                    .OrderBy(l => l.OrderIndex)
                    .Take(3)
                    .Select(l => new
                    {
                        id = l.Id,
                        title = l.Title,
                        description = l.Description,
                        difficulty = l.Difficulty.ToString(),
                        updatedAt = l.UpdatedAt,
                        progress = 0
                    })
                    .ToListAsync();
                
                return Ok(publishedLessons);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting recent lessons");
                return StatusCode(500, "Error getting recent lessons");
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Lesson>> GetLesson(Guid id)
        {
            var lesson = await _context.Lessons
                .Include(l => l.Quizzes)
                .ThenInclude(q => q.Questions)
                .ThenInclude(q => q.Options)
                .FirstOrDefaultAsync(l => l.Id == id);

            if (lesson == null)
            {
                return NotFound();
            }

            return Ok(lesson);
        }

        [HttpPost]
        [Authorize(Policy = "TeacherOrAdmin")]
        public async Task<ActionResult<Lesson>> CreateLesson(CreateLessonRequest request)
        {
            var userId = GetCurrentUserId();
            
            var lesson = new Lesson
            {
                Title = request.Title,
                Description = request.Description,
                Content = request.Content,
                CodeExamples = request.CodeExamples,
                Difficulty = request.Difficulty,
                OrderIndex = request.OrderIndex,
                CreatedByUserId = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsPublished = request.IsPublished,
                IsAiGenerated = false
            };

            _context.Lessons.Add(lesson);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetLesson), new { id = lesson.Id }, lesson);
        }

        [HttpPost("generate")]
        [Authorize(Policy = "TeacherOrAdmin")]
        public async Task<ActionResult<Lesson>> GenerateLesson(GenerateLessonRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();
                
                // Generate lesson content using AI
                var content = await _geminiService.GenerateLessonContentAsync(request.Topic, request.Difficulty);
                
                // Generate code examples
                var codeExamples = await _geminiService.GenerateCodeExampleAsync(request.Topic, request.Difficulty);

                var lesson = new Lesson
                {
                    Title = $"{request.Topic} - {request.Difficulty} Level",
                    Description = $"AI-generated lesson on {request.Topic}",
                    Content = content,
                    CodeExamples = codeExamples,
                    Difficulty = request.Difficulty,
                    OrderIndex = await GetNextOrderIndex(),
                    CreatedByUserId = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsPublished = false, // Require manual review before publishing
                    IsAiGenerated = true
                };

                _context.Lessons.Add(lesson);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetLesson), new { id = lesson.Id }, lesson);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating lesson for topic: {Topic}", request.Topic);
                return StatusCode(500, "Error generating lesson content");
            }
        }

        [HttpPost("{id}/quiz/generate")]
        [Authorize(Policy = "TeacherOrAdmin")]
        public async Task<ActionResult<Quiz>> GenerateQuiz(Guid id, GenerateQuizRequest request)
        {
            try
            {
                var lesson = await _context.Lessons.FindAsync(id);
                if (lesson == null)
                {
                    return NotFound();
                }

                var userId = GetCurrentUserId();
                
                // Generate quiz questions using AI
                var questions = await _geminiService.GenerateQuizQuestionsAsync(lesson.Content, request.QuestionCount);

                var quiz = new Quiz
                {
                    Title = $"{lesson.Title} - Quiz",
                    Description = $"AI-generated quiz for {lesson.Title}",
                    LessonId = lesson.Id,
                    TimeLimit = request.TimeLimit,
                    CreatedByUserId = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsPublished = false, // Require manual review
                    IsAiGenerated = true,
                    Questions = questions
                };

                _context.Quizzes.Add(quiz);
                await _context.SaveChangesAsync();

                return Ok(quiz);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating quiz for lesson: {LessonId}", id);
                return StatusCode(500, "Error generating quiz");
            }
        }

        [HttpPost("validate-code")]
        [Authorize]
        public async Task<ActionResult<LessonCodeValidationResult>> ValidateCode(ValidateCodeRequest request)
        {
            try
            {
                var feedback = await _geminiService.ValidateCodeAsync(request.Code, request.ExpectedOutput);
                
                var result = new LessonCodeValidationResult
                {
                    IsValid = !feedback.Contains("Issues Found:") || feedback.Contains("Issues Found: None"),
                    Feedback = feedback,
                    Timestamp = DateTime.UtcNow
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating code");
                return StatusCode(500, "Error validating code");
            }
        }

        [HttpGet("recommendations")]
        [Authorize(Policy = "StudentOnly")]
        public async Task<ActionResult<string>> GetLearningRecommendations()
        {
            try
            {
                var userId = GetCurrentUserId();
                
                // Get completed lessons for the user
                var completedLessons = await _context.StudentProgresses
                    .Where(sp => sp.UserId == userId && sp.Status == ProgressStatus.Completed)
                    .Include(sp => sp.Lesson)
                    .Select(sp => sp.Lesson.Title)
                    .ToListAsync();

                // Determine student level based on completed lessons
                var studentLevel = completedLessons.Count switch
                {
                    0 => "Beginner",
                    < 5 => "Beginner",
                    < 15 => "Intermediate",
                    _ => "Advanced"
                };

                var recommendations = await _geminiService.GetLearningRecommendationsAsync(studentLevel, completedLessons);
                
                return Ok(new { recommendations, studentLevel, completedCount = completedLessons.Count });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting learning recommendations");
                return StatusCode(500, "Error getting recommendations");
            }
        }

        [HttpPut("{id}")]
        [Authorize(Policy = "TeacherOrAdmin")]
        public async Task<IActionResult> UpdateLesson(Guid id, UpdateLessonRequest request)
        {
            var lesson = await _context.Lessons.FindAsync(id);
            if (lesson == null)
            {
                return NotFound();
            }

            lesson.Title = request.Title;
            lesson.Description = request.Description;
            lesson.Content = request.Content;
            lesson.CodeExamples = request.CodeExamples;
            lesson.Difficulty = request.Difficulty;
            lesson.OrderIndex = request.OrderIndex;
            lesson.IsPublished = request.IsPublished;
            lesson.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> DeleteLesson(Guid id)
        {
            var lesson = await _context.Lessons.FindAsync(id);
            if (lesson == null)
            {
                return NotFound();
            }

            _context.Lessons.Remove(lesson);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private Guid GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst("UserId")?.Value;
            return Guid.Parse(userIdClaim ?? Guid.Empty.ToString());
        }

        private async Task<int> GetNextOrderIndex()
        {
            var maxOrder = await _context.Lessons.MaxAsync(l => (int?)l.OrderIndex) ?? 0;
            return maxOrder + 1;
        }
    }

    // Request/Response DTOs
    public class CreateLessonRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string CodeExamples { get; set; } = string.Empty;
        public LessonDifficulty Difficulty { get; set; }
        public int OrderIndex { get; set; }
        public bool IsPublished { get; set; }
    }

    public class GenerateLessonRequest
    {
        public string Topic { get; set; } = string.Empty;
        public LessonDifficulty Difficulty { get; set; }
    }

    public class GenerateQuizRequest
    {
        public string LessonContent { get; set; } = string.Empty;
        public int QuestionCount { get; set; } = 5;
        public int TimeLimit { get; set; } = 30; // minutes
    }

    public class ValidateCodeRequest
    {
        public string Code { get; set; } = string.Empty;
        public string ExpectedOutput { get; set; } = string.Empty;
    }

    public class LessonCodeValidationResult
    {
        public bool IsValid { get; set; }
        public string Feedback { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
    }

    public class UpdateLessonRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string CodeExamples { get; set; } = string.Empty;
        public LessonDifficulty Difficulty { get; set; }
        public int OrderIndex { get; set; }
        public bool IsPublished { get; set; }
    }
}