using CodeEase.Data;
using CodeEase.Models;
using Microsoft.EntityFrameworkCore;

namespace CodeEase.Services
{
    public class StudentService
    {
        private readonly CodeEaseDbContext _context;

        public StudentService(CodeEaseDbContext context)
        {
            _context = context;
        }

        // Lesson Management
        public async Task<List<Lesson>> GetAvailableLessonsAsync(Guid studentId)
        {
            // Get lessons from enrolled classes or published lessons
            var enrolledClassLessons = await _context.ClassEnrollments
                .Where(e => e.StudentId == studentId && e.IsActive)
                .SelectMany(e => e.Class.ClassLessons)
                .Select(cl => cl.Lesson)
                .ToListAsync();

            var publishedLessons = await _context.Lessons
                .Where(l => l.IsPublished)
                .ToListAsync();

            var allLessons = enrolledClassLessons.Union(publishedLessons)
                .OrderBy(l => l.OrderIndex)
                .ThenBy(l => l.CreatedAt)
                .ToList();

            return allLessons;
        }

        public async Task<Lesson?> GetLessonAsync(Guid lessonId, Guid studentId)
        {
            var lesson = await _context.Lessons
                .Include(l => l.Quizzes)
                .FirstOrDefaultAsync(l => l.Id == lessonId && l.IsPublished);

            if (lesson != null)
            {
                // Update last accessed time
                await UpdateLessonProgressAsync(studentId, lessonId, ProgressStatus.InProgress);
            }

            return lesson;
        }

        // Progress Management
        public async Task<StudentProgress> UpdateLessonProgressAsync(Guid studentId, Guid lessonId, ProgressStatus status, double? completionPercentage = null)
        {
            var progress = await _context.StudentProgresses
                .FirstOrDefaultAsync(p => p.UserId == studentId && p.LessonId == lessonId);

            if (progress == null)
            {
                progress = new StudentProgress
                {
                    UserId = studentId,
                    LessonId = lessonId,
                    Status = status,
                    StartedAt = DateTime.UtcNow
                };
                _context.StudentProgresses.Add(progress);
            }
            else
            {
                progress.Status = status;
                progress.LastAccessedAt = DateTime.UtcNow;
                
                if (status == ProgressStatus.Completed && progress.CompletedAt == null)
                {
                    progress.CompletedAt = DateTime.UtcNow;
                }
            }

            if (completionPercentage.HasValue)
            {
                progress.CompletionPercentage = completionPercentage.Value;
            }

            await _context.SaveChangesAsync();
            return progress;
        }

        public async Task<List<StudentProgress>> GetStudentProgressAsync(Guid studentId)
        {
            return await _context.StudentProgresses
                .Include(p => p.Lesson)
                .Where(p => p.UserId == studentId)
                .OrderBy(p => p.Lesson.OrderIndex)
                .ToListAsync();
        }

        // Quiz Management
        public async Task<Quiz?> GetQuizAsync(Guid quizId, Guid studentId)
        {
            return await _context.Quizzes
                .Include(q => q.Questions)
                    .ThenInclude(qq => qq.Options)
                .Include(q => q.Lesson)
                .FirstOrDefaultAsync(q => q.Id == quizId && q.IsPublished);
        }

        public async Task<QuizAttempt> StartQuizAttemptAsync(Guid studentId, Guid quizId)
        {
            // Get the next attempt number
            var attemptCount = await _context.QuizAttempts
                .CountAsync(qa => qa.UserId == studentId && qa.QuizId == quizId);

            var quiz = await _context.Quizzes
                .Include(q => q.Questions)
                .FirstOrDefaultAsync(q => q.Id == quizId);

            if (quiz == null)
                throw new ArgumentException("Quiz not found");

            var attempt = new QuizAttempt
            {
                UserId = studentId,
                QuizId = quizId,
                AttemptNumber = attemptCount + 1,
                MaxScore = quiz.Questions.Sum(q => q.Points),
                StartedAt = DateTime.UtcNow
            };

            _context.QuizAttempts.Add(attempt);
            await _context.SaveChangesAsync();

            return attempt;
        }

        public async Task<QuizAnswer> SubmitQuizAnswerAsync(Guid attemptId, Guid questionId, string? answerText, Guid? selectedOptionId)
        {
            var question = await _context.QuizQuestions
                .Include(q => q.Options)
                .FirstOrDefaultAsync(q => q.Id == questionId);

            if (question == null)
                throw new ArgumentException("Question not found");

            // Remove existing answer if any
            var existingAnswer = await _context.QuizAnswers
                .FirstOrDefaultAsync(qa => qa.AttemptId == attemptId && qa.QuestionId == questionId);

            if (existingAnswer != null)
            {
                _context.QuizAnswers.Remove(existingAnswer);
            }

            // Determine if answer is correct
            bool isCorrect = false;
            int pointsEarned = 0;

            if (question.Type == QuestionType.MultipleChoice || question.Type == QuestionType.TrueFalse)
            {
                var selectedOption = question.Options.FirstOrDefault(o => o.Id == selectedOptionId);
                isCorrect = selectedOption?.IsCorrect ?? false;
            }
            else if (question.Type == QuestionType.ShortAnswer)
            {
                // Simple text comparison (could be enhanced with fuzzy matching)
                var correctOption = question.Options.FirstOrDefault(o => o.IsCorrect);
                isCorrect = correctOption != null && 
                           string.Equals(answerText?.Trim(), correctOption.OptionText.Trim(), StringComparison.OrdinalIgnoreCase);
            }

            if (isCorrect)
            {
                pointsEarned = question.Points;
            }

            var answer = new QuizAnswer
            {
                AttemptId = attemptId,
                QuestionId = questionId,
                AnswerText = answerText,
                SelectedOptionId = selectedOptionId,
                IsCorrect = isCorrect,
                PointsEarned = pointsEarned
            };

            _context.QuizAnswers.Add(answer);
            await _context.SaveChangesAsync();

            return answer;
        }

        public async Task<QuizAttempt> CompleteQuizAttemptAsync(Guid attemptId)
        {
            var attempt = await _context.QuizAttempts
                .Include(qa => qa.Answers)
                .FirstOrDefaultAsync(qa => qa.Id == attemptId);

            if (attempt == null)
                throw new ArgumentException("Quiz attempt not found");

            attempt.CompletedAt = DateTime.UtcNow;
            attempt.IsCompleted = true;
            attempt.Score = attempt.Answers.Sum(a => a.PointsEarned);
            attempt.Percentage = attempt.MaxScore > 0 ? (double)attempt.Score / attempt.MaxScore * 100 : 0;

            await _context.SaveChangesAsync();

            return attempt;
        }

        public async Task<List<QuizAttempt>> GetQuizAttemptsAsync(Guid studentId, Guid? quizId = null)
        {
            var query = _context.QuizAttempts
                .Include(qa => qa.Quiz)
                .Where(qa => qa.UserId == studentId);

            if (quizId.HasValue)
            {
                query = query.Where(qa => qa.QuizId == quizId.Value);
            }

            return await query
                .OrderByDescending(qa => qa.StartedAt)
                .ToListAsync();
        }

        // Dashboard Data
        public async Task<StudentDashboardData> GetDashboardDataAsync(Guid studentId)
        {
            var totalLessons = await _context.Lessons.CountAsync(l => l.IsPublished);
            var completedLessons = await _context.StudentProgresses
                .CountAsync(p => p.UserId == studentId && p.Status == ProgressStatus.Completed);

            var recentProgress = await _context.StudentProgresses
                .Include(p => p.Lesson)
                .Where(p => p.UserId == studentId)
                .OrderByDescending(p => p.LastAccessedAt)
                .Take(5)
                .ToListAsync();

            var recentQuizzes = await _context.QuizAttempts
                .Include(qa => qa.Quiz)
                .Where(qa => qa.UserId == studentId)
                .OrderByDescending(qa => qa.StartedAt)
                .Take(5)
                .ToListAsync();

            return new StudentDashboardData
            {
                TotalLessons = totalLessons,
                CompletedLessons = completedLessons,
                ProgressPercentage = totalLessons > 0 ? (double)completedLessons / totalLessons * 100 : 0,
                RecentProgress = recentProgress,
                RecentQuizAttempts = recentQuizzes
            };
        }
    }

    public class StudentDashboardData
    {
        public int TotalLessons { get; set; }
        public int CompletedLessons { get; set; }
        public double ProgressPercentage { get; set; }
        public List<StudentProgress> RecentProgress { get; set; } = new();
        public List<QuizAttempt> RecentQuizAttempts { get; set; } = new();
    }
}