using CodeEase.Models;
using CodeEase.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CodeEase.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class TeacherController : ControllerBase
    {
        private readonly TeacherService _teacherService;

        public TeacherController(TeacherService teacherService)
        {
            _teacherService = teacherService;
        }

        private string GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return userIdClaim ?? "550e8400-e29b-41d4-a716-446655440000";
        }

        // Dashboard
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            try
            {
                var teacherId = GetCurrentUserId();
                if (string.IsNullOrEmpty(teacherId)) return Unauthorized();

                var dashboard = await _teacherService.GetTeacherDashboardDataAsync(teacherId);
                return Ok(dashboard);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error loading dashboard", error = ex.Message });
            }
        }
        
        // Quiz Assignment Endpoints
        [HttpPost("quiz/{quizId}/assign")]
        public async Task<IActionResult> AssignQuizToClasses(string quizId, [FromBody] AssignQuizRequest request)
        {
            try
            {
                var teacherId = GetCurrentUserId();
                if (string.IsNullOrEmpty(teacherId)) return Unauthorized();

                if (request.ClassIds == null || !request.ClassIds.Any())
                    return BadRequest(new { message = "At least one class must be selected" });

                var success = await _teacherService.AssignQuizToClassesAsync(
                    quizId, 
                    teacherId, 
                    request.ClassIds, 
                    request.DueDate
                );

                if (!success) return NotFound(new { message = "Quiz not found or not owned by teacher" });

                return Ok(new { message = "Quiz assigned successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error assigning quiz", error = ex.Message });
            }
        }
        
        [HttpGet("quiz/{quizId}/assignments")]
        public async Task<IActionResult> GetQuizAssignments(string quizId)
        {
            try
            {
                var teacherId = GetCurrentUserId();
                if (string.IsNullOrEmpty(teacherId)) return Unauthorized();

                var assignments = await _teacherService.GetQuizAssignmentsAsync(quizId, teacherId);
                return Ok(assignments);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error retrieving quiz assignments", error = ex.Message });
            }
        }

        // Class Management
        [HttpGet("classes")]
        public async Task<IActionResult> GetClasses()
        {
            try
            {
                var teacherId = GetCurrentUserId();
                if (string.IsNullOrEmpty(teacherId)) return Unauthorized();

                var classes = await _teacherService.GetTeacherClassesAsync(teacherId);
                return Ok(classes);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error loading classes", error = ex.Message });
            }
        }

        [HttpPost("classes")]
        public async Task<IActionResult> CreateClass([FromBody] CreateClassRequest request)
        {
            try
            {
                var teacherId = GetCurrentUserId();
                if (string.IsNullOrEmpty(teacherId)) return Unauthorized();

                if (string.IsNullOrWhiteSpace(request.Name))
                    return BadRequest(new { message = "Class name is required" });

                var newClass = await _teacherService.CreateClassAsync(teacherId, request.Name, request.Description ?? "");
                return Ok(newClass);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error creating class", error = ex.Message });
            }
        }

        [HttpGet("classes/{classId}")]
        public async Task<IActionResult> GetClass(string classId)
        {
            try
            {
                var teacherId = GetCurrentUserId();
                if (string.IsNullOrEmpty(teacherId)) return Unauthorized();

                var classData = await _teacherService.GetClassByIdAsync(classId, teacherId);
                if (classData == null) return NotFound();

                return Ok(classData);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error loading class", error = ex.Message });
            }
        }

        [HttpPut("classes/{classId}")]
        public async Task<IActionResult> UpdateClass(string classId, [FromBody] UpdateClassRequest request)
        {
            try
            {
                var teacherId = GetCurrentUserId();
                if (string.IsNullOrEmpty(teacherId)) return Unauthorized();

                if (string.IsNullOrWhiteSpace(request.Name))
                    return BadRequest(new { message = "Class name is required" });

                var success = await _teacherService.UpdateClassAsync(classId, teacherId, request.Name, request.Description ?? "");
                if (!success) return NotFound();

                return Ok(new { message = "Class updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error updating class", error = ex.Message });
            }
        }

        [HttpDelete("classes/{classId}")]
        public async Task<IActionResult> DeleteClass(string classId)
        {
            try
            {
                var teacherId = GetCurrentUserId();
                if (string.IsNullOrEmpty(teacherId)) return Unauthorized();

                var success = await _teacherService.DeleteClassAsync(classId, teacherId);
                if (!success) return NotFound();

                return Ok(new { message = "Class deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error deleting class", error = ex.Message });
            }
        }

        // Lesson Management
        [HttpGet("lessons")]
        public async Task<IActionResult> GetLessons()
        {
            try
            {
                var teacherId = GetCurrentUserId();
                if (string.IsNullOrEmpty(teacherId)) return Unauthorized();

                var lessons = await _teacherService.GetTeacherLessonsAsync(teacherId);
                return Ok(lessons);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error loading lessons", error = ex.Message });
            }
        }

        [HttpPost("lessons")]
        public async Task<IActionResult> CreateLesson([FromBody] CreateLessonRequest request)
        {
            try
            {
                var teacherId = GetCurrentUserId();
                if (string.IsNullOrEmpty(teacherId)) return Unauthorized();

                if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Content))
                    return BadRequest(new { message = "Title and content are required" });

                var lesson = await _teacherService.CreateLessonAsync(
                    teacherId, 
                    request.Title, 
                    request.Description ?? "", 
                    request.Content, 
                    request.Difficulty
                );

                return Ok(lesson);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error creating lesson", error = ex.Message });
            }
        }

        [HttpGet("lessons/{lessonId}")]
        public async Task<IActionResult> GetLesson(string lessonId)
        {
            try
            {
                var teacherId = GetCurrentUserId();
                if (string.IsNullOrEmpty(teacherId)) return Unauthorized();

                var lesson = await _teacherService.GetLessonByIdAsync(lessonId, teacherId);
                if (lesson == null) return NotFound();

                return Ok(lesson);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error loading lesson", error = ex.Message });
            }
        }

        [HttpPut("lessons/{lessonId}")]
        public async Task<IActionResult> UpdateLesson(string lessonId, [FromBody] UpdateLessonRequest request)
        {
            try
            {
                var teacherId = GetCurrentUserId();
                if (string.IsNullOrEmpty(teacherId)) return Unauthorized();

                if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Content))
                    return BadRequest(new { message = "Title and content are required" });

                var success = await _teacherService.UpdateLessonAsync(
                    lessonId, 
                    teacherId, 
                    request.Title, 
                    request.Description ?? "", 
                    request.Content, 
                    request.Difficulty
                );

                if (!success) return NotFound();

                return Ok(new { message = "Lesson updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error updating lesson", error = ex.Message });
            }
        }

        [HttpPost("lessons/{lessonId}/publish")]
        public async Task<IActionResult> PublishLesson(string lessonId)
        {
            try
            {
                var teacherId = GetCurrentUserId();
                if (string.IsNullOrEmpty(teacherId)) return Unauthorized();

                var success = await _teacherService.PublishLessonAsync(lessonId, teacherId);
                if (!success) return NotFound();

                return Ok(new { message = "Lesson published successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error publishing lesson", error = ex.Message });
            }
        }

        [HttpPost("lessons/{lessonId}/assign/{classId}")]
        public async Task<IActionResult> AssignLessonToClass(string lessonId, string classId)
        {
            try
            {
                var teacherId = GetCurrentUserId();
                if (string.IsNullOrEmpty(teacherId)) return Unauthorized();

                var success = await _teacherService.AssignLessonToClassAsync(lessonId, classId, teacherId);
                if (!success) return NotFound();

                return Ok(new { message = "Lesson assigned to class successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error assigning lesson", error = ex.Message });
            }
        }

        // Quiz Management
        [HttpPost("lessons/{lessonId}/quiz")]
        public async Task<IActionResult> CreateQuiz(string lessonId, [FromBody] CreateQuizRequest request)
        {
            try
            {
                var teacherId = GetCurrentUserId();
                if (string.IsNullOrEmpty(teacherId)) return Unauthorized();

                if (string.IsNullOrWhiteSpace(request.Title))
                    return BadRequest(new { message = "Quiz title is required" });

                var quiz = await _teacherService.CreateQuizForLessonAsync(
                    lessonId, 
                    teacherId, 
                    request.Title, 
                    request.Description ?? "", 
                    request.TimeLimit
                );

                return Ok(quiz);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error creating quiz", error = ex.Message });
            }
        }

        [HttpPost("quiz/{quizId}/questions")]
        public async Task<IActionResult> AddQuestionToQuiz(string quizId, [FromBody] AddQuestionRequest request)
        {
            try
            {
                var teacherId = GetCurrentUserId();
                if (string.IsNullOrEmpty(teacherId)) return Unauthorized();

                if (string.IsNullOrWhiteSpace(request.QuestionText))
                    return BadRequest(new { message = "Question text is required" });

                var success = await _teacherService.AddQuestionToQuizAsync(
                    quizId, 
                    teacherId, 
                    request.QuestionText, 
                    request.Type, 
                    request.Options
                );

                if (!success) return NotFound();

                return Ok(new { message = "Question added successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error adding question", error = ex.Message });
            }
        }

        // Student Progress Monitoring
        [HttpGet("classes/{classId}/progress")]
        public async Task<IActionResult> GetClassProgress(string classId)
        {
            try
            {
                var teacherId = GetCurrentUserId();
                if (string.IsNullOrEmpty(teacherId)) return Unauthorized();

                var progress = await _teacherService.GetClassProgressAsync(classId, teacherId);
                return Ok(progress);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error loading class progress", error = ex.Message });
            }
        }

        [HttpGet("classes/{classId}/quiz-attempts")]
        public async Task<IActionResult> GetClassQuizAttempts(string classId)
        {
            try
            {
                var teacherId = GetCurrentUserId();
                if (string.IsNullOrEmpty(teacherId)) return Unauthorized();

                var attempts = await _teacherService.GetClassQuizAttemptsAsync(classId, teacherId);
                return Ok(attempts);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error loading quiz attempts", error = ex.Message });
            }
        }

        // AI Content Generation
        [HttpPost("ai/generate-lesson")]
        public async Task<IActionResult> GenerateLessonContent([FromBody] GenerateLessonRequest request)
        {
            try
            {
                var teacherId = GetCurrentUserId();
                if (string.IsNullOrEmpty(teacherId)) return Unauthorized();

                if (string.IsNullOrWhiteSpace(request.Topic))
                    return BadRequest(new { message = "Topic is required" });

                var content = await _teacherService.GenerateLessonContentAsync(request.Topic, request.Difficulty);
                return Ok(new { content });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error generating lesson content", error = ex.Message });
            }
        }

        [HttpPost("ai/generate-quiz")]
        public async Task<IActionResult> GenerateQuizQuestions([FromBody] GenerateQuizRequest request)
        {
            try
            {
                var teacherId = GetCurrentUserId();
                if (string.IsNullOrEmpty(teacherId)) return Unauthorized();

                if (string.IsNullOrWhiteSpace(request.LessonContent))
                    return BadRequest(new { message = "Lesson content is required" });

                var questions = await _teacherService.GenerateQuizQuestionsAsync(request.LessonContent, request.QuestionCount);
                return Ok(questions);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error generating quiz questions", error = ex.Message });
            }
        }
    }

    // Request DTOs
    public class CreateClassRequest
    {
        public string Name { get; set; } = "";
        public string? Description { get; set; }
    }

    public class UpdateClassRequest
    {
        public string Name { get; set; } = "";
        public string? Description { get; set; }
    }

    public class CreateQuizRequest
    {
        public string Title { get; set; } = "";
        public string? Description { get; set; }
        public int TimeLimit { get; set; } = 30;
    }

    public class AddQuestionRequest
    {
        public string QuestionText { get; set; } = "";
        public QuestionType Type { get; set; }
        public List<(string text, bool isCorrect)> Options { get; set; } = new();
    }
    
    public class AssignQuizRequest
    {
        public List<string> ClassIds { get; set; } = new();
        public DateTime? DueDate { get; set; }
    }
}