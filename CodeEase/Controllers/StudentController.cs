using CodeEase.Models;
using CodeEase.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CodeEase.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StudentController : ControllerBase
    {
        private readonly StudentService _studentService;

        public StudentController(StudentService studentService)
        {
            _studentService = studentService;
        }

        private Guid GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
        }

        // Dashboard
        [HttpGet("dashboard")]
        public async Task<ActionResult<StudentDashboardData>> GetDashboard()
        {
            try
            {
                var studentId = GetCurrentUserId();
                if (studentId == Guid.Empty)
                    return Unauthorized();

                var dashboardData = await _studentService.GetDashboardDataAsync(studentId);
                return Ok(dashboardData);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error retrieving dashboard data", error = ex.Message });
            }
        }

        // Lessons
        [HttpGet("lessons")]
        public async Task<ActionResult<List<Lesson>>> GetLessons()
        {
            try
            {
                var studentId = GetCurrentUserId();
                if (studentId == Guid.Empty)
                    return Unauthorized();

                var lessons = await _studentService.GetAvailableLessonsAsync(studentId);
                return Ok(lessons);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error retrieving lessons", error = ex.Message });
            }
        }

        [HttpGet("lessons/{lessonId}")]
        public async Task<ActionResult<Lesson>> GetLesson(Guid lessonId)
        {
            try
            {
                var studentId = GetCurrentUserId();
                if (studentId == Guid.Empty)
                    return Unauthorized();

                var lesson = await _studentService.GetLessonAsync(lessonId, studentId);
                if (lesson == null)
                    return NotFound(new { message = "Lesson not found" });

                return Ok(lesson);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error retrieving lesson", error = ex.Message });
            }
        }

        // Progress
        [HttpGet("progress")]
        public async Task<ActionResult<List<StudentProgress>>> GetProgress()
        {
            try
            {
                var studentId = GetCurrentUserId();
                if (studentId == Guid.Empty)
                    return Unauthorized();

                var progress = await _studentService.GetStudentProgressAsync(studentId);
                return Ok(progress);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error retrieving progress", error = ex.Message });
            }
        }

        [HttpPost("progress/{lessonId}")]
        public async Task<ActionResult<StudentProgress>> UpdateProgress(Guid lessonId, [FromBody] UpdateProgressRequest request)
        {
            try
            {
                var studentId = GetCurrentUserId();
                if (studentId == Guid.Empty)
                    return Unauthorized();

                var progress = await _studentService.UpdateLessonProgressAsync(
                    studentId, 
                    lessonId, 
                    request.Status, 
                    request.CompletionPercentage);

                return Ok(progress);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error updating progress", error = ex.Message });
            }
        }

        // Quizzes
        [HttpGet("quizzes/{quizId}")]
        public async Task<ActionResult<Quiz>> GetQuiz(Guid quizId)
        {
            try
            {
                var studentId = GetCurrentUserId();
                if (studentId == Guid.Empty)
                    return Unauthorized();

                var quiz = await _studentService.GetQuizAsync(quizId, studentId);
                if (quiz == null)
                    return NotFound(new { message = "Quiz not found" });

                return Ok(quiz);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error retrieving quiz", error = ex.Message });
            }
        }

        [HttpPost("quizzes/{quizId}/start")]
        public async Task<ActionResult<QuizAttempt>> StartQuiz(Guid quizId)
        {
            try
            {
                var studentId = GetCurrentUserId();
                if (studentId == Guid.Empty)
                    return Unauthorized();

                var attempt = await _studentService.StartQuizAttemptAsync(studentId, quizId);
                return Ok(attempt);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error starting quiz", error = ex.Message });
            }
        }

        [HttpPost("quiz-attempts/{attemptId}/answers")]
        public async Task<ActionResult<QuizAnswer>> SubmitAnswer(Guid attemptId, [FromBody] SubmitAnswerRequest request)
        {
            try
            {
                var answer = await _studentService.SubmitQuizAnswerAsync(
                    attemptId, 
                    request.QuestionId, 
                    request.AnswerText, 
                    request.SelectedOptionId);

                return Ok(answer);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error submitting answer", error = ex.Message });
            }
        }

        [HttpPost("quiz-attempts/{attemptId}/complete")]
        public async Task<ActionResult<QuizAttempt>> CompleteQuiz(Guid attemptId)
        {
            try
            {
                var attempt = await _studentService.CompleteQuizAttemptAsync(attemptId);
                return Ok(attempt);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error completing quiz", error = ex.Message });
            }
        }

        [HttpGet("quiz-attempts")]
        public async Task<ActionResult<List<QuizAttempt>>> GetQuizAttempts([FromQuery] Guid? quizId = null)
        {
            try
            {
                var studentId = GetCurrentUserId();
                if (studentId == Guid.Empty)
                    return Unauthorized();

                var attempts = await _studentService.GetQuizAttemptsAsync(studentId, quizId);
                return Ok(attempts);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error retrieving quiz attempts", error = ex.Message });
            }
        }
    }

    // Request DTOs
    public class UpdateProgressRequest
    {
        public ProgressStatus Status { get; set; }
        public double? CompletionPercentage { get; set; }
    }

    public class SubmitAnswerRequest
    {
        public Guid QuestionId { get; set; }
        public string? AnswerText { get; set; }
        public Guid? SelectedOptionId { get; set; }
    }
}