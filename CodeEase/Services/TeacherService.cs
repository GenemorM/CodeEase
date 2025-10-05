using CodeEase.Data;
using CodeEase.Models;
using Microsoft.EntityFrameworkCore;

namespace CodeEase.Services
{
    public class TeacherService
{
    private readonly CodeEaseDbContext _context;
    private readonly GeminiService _geminiService;

    public TeacherService(CodeEaseDbContext context, GeminiService geminiService)
        {
            _context = context;
            _geminiService = geminiService;
        }

        // Class Management
        public async Task<List<Class>> GetTeacherClassesAsync(string teacherId)
        {
            var teacherGuid = Guid.Parse(teacherId);
            return await _context.Classes
                .Where(c => c.TeacherId == teacherGuid)
                .Include(c => c.Enrollments)
                    .ThenInclude(e => e.Student)
                .Include(c => c.ClassLessons)
                    .ThenInclude(cl => cl.Lesson)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();
        }

        public async Task<Class> CreateClassAsync(string teacherId, string name, string description)
        {
            var teacherGuid = Guid.Parse(teacherId);
            var classCode = GenerateClassCode();
            var newClass = new Class
            {
                Name = name,
                Description = description,
                TeacherId = teacherGuid,
                ClassCode = classCode,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Classes.Add(newClass);
            await _context.SaveChangesAsync();
            return newClass;
        }

        public async Task<Class?> GetClassByIdAsync(string classId, string teacherId)
        {
            var classGuid = Guid.Parse(classId);
            var teacherGuid = Guid.Parse(teacherId);
            return await _context.Classes
                .Include(c => c.Enrollments)
                    .ThenInclude(e => e.Student)
                .Include(c => c.ClassLessons)
                    .ThenInclude(cl => cl.Lesson)
                .FirstOrDefaultAsync(c => c.Id == classGuid && c.TeacherId == teacherGuid);
        }

        public async Task<bool> UpdateClassAsync(string classId, string teacherId, string name, string description)
        {
            var classGuid = Guid.Parse(classId);
            var teacherGuid = Guid.Parse(teacherId);
            var existingClass = await _context.Classes
                .FirstOrDefaultAsync(c => c.Id == classGuid && c.TeacherId == teacherGuid);

            if (existingClass == null) return false;

            existingClass.Name = name;
            existingClass.Description = description;
            existingClass.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }
        
        // Quiz Assignment Management
        public async Task<bool> AssignQuizToClassesAsync(string quizId, string teacherId, List<string> classIds, DateTime? dueDate = null)
        {
            var quizGuid = Guid.Parse(quizId);
            var teacherGuid = Guid.Parse(teacherId);
            
            // Verify the quiz belongs to the teacher
            var quiz = await _context.Quizzes
                .Include(q => q.Lesson)
                .FirstOrDefaultAsync(q => q.Id == quizGuid && q.Lesson.CreatedByUserId == teacherGuid);

            if (quiz == null) return false;

            // Remove existing assignments for this quiz
            var existingAssignments = await _context.QuizAssignments
                .Where(qa => qa.QuizId == quizGuid)
                .ToListAsync();
            _context.QuizAssignments.RemoveRange(existingAssignments);

            // Create new assignments
            var assignments = classIds.Select(classId => new QuizAssignment
            {
                QuizId = quizGuid,
                ClassId = Guid.Parse(classId),
                DueDate = dueDate,
                AssignedByUserId = teacherGuid,
                AssignedAt = DateTime.UtcNow,
                IsActive = true
            }).ToList();

            _context.QuizAssignments.AddRange(assignments);
            await _context.SaveChangesAsync();
            return true;
        }
        
        public async Task<List<QuizAssignment>> GetQuizAssignmentsAsync(string quizId, string teacherId)
        {
            var quizGuid = Guid.Parse(quizId);
            var teacherGuid = Guid.Parse(teacherId);
            
            return await _context.QuizAssignments
                .Include(qa => qa.Class)
                .Include(qa => qa.Quiz)
                    .ThenInclude(q => q.Lesson)
                .Where(qa => qa.QuizId == quizGuid && qa.Quiz.Lesson.CreatedByUserId == teacherGuid)
                .ToListAsync();
        }

        public async Task<bool> DeleteClassAsync(string classId, string teacherId)
        {
            var classGuid = Guid.Parse(classId);
            var teacherGuid = Guid.Parse(teacherId);
            var existingClass = await _context.Classes
                .FirstOrDefaultAsync(c => c.Id == classGuid && c.TeacherId == teacherGuid);

            if (existingClass == null) return false;

            existingClass.IsActive = false;
            existingClass.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        // Lesson Management
        public async Task<List<Lesson>> GetTeacherLessonsAsync(string teacherId)
        {
            var teacherGuid = Guid.Parse(teacherId);
            return await _context.Lessons
                .Where(l => l.CreatedByUserId == teacherGuid)
                .OrderByDescending(l => l.CreatedAt)
                .ToListAsync();
        }

        public async Task<Lesson> CreateLessonAsync(string teacherId, string title, string description, 
            string content, LessonDifficulty difficulty)
        {
            var teacherGuid = Guid.Parse(teacherId);
            var lesson = new Lesson
            {
                Title = title,
                Description = description,
                Content = content,
                Difficulty = difficulty,
                CreatedByUserId = teacherGuid,
                CreatedAt = DateTime.UtcNow,
                IsPublished = false
            };

            _context.Lessons.Add(lesson);
            await _context.SaveChangesAsync();
            return lesson;
        }

        public async Task<Lesson?> GetLessonByIdAsync(string lessonId, string teacherId)
        {
            var lessonGuid = Guid.Parse(lessonId);
            var teacherGuid = Guid.Parse(teacherId);
            return await _context.Lessons
                .Include(l => l.Quizzes)
                    .ThenInclude(q => q.Questions)
                .FirstOrDefaultAsync(l => l.Id == lessonGuid && l.CreatedByUserId == teacherGuid);
        }

        public async Task<bool> UpdateLessonAsync(string lessonId, string teacherId, string title, 
            string description, string content, LessonDifficulty difficulty)
        {
            var lessonGuid = Guid.Parse(lessonId);
            var teacherGuid = Guid.Parse(teacherId);
            var lesson = await _context.Lessons
                .FirstOrDefaultAsync(l => l.Id == lessonGuid && l.CreatedByUserId == teacherGuid);

            if (lesson == null) return false;

            lesson.Title = title;
            lesson.Description = description;
            lesson.Content = content;
            lesson.Difficulty = difficulty;
            lesson.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> PublishLessonAsync(string lessonId, string teacherId)
        {
            var lessonGuid = Guid.Parse(lessonId);
            var teacherGuid = Guid.Parse(teacherId);
            var lesson = await _context.Lessons
                .FirstOrDefaultAsync(l => l.Id == lessonGuid && l.CreatedByUserId == teacherGuid);

            if (lesson == null) return false;

            lesson.IsPublished = true;
            lesson.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> AssignLessonToClassAsync(string lessonId, string classId, string teacherId)
        {
            var lessonGuid = Guid.Parse(lessonId);
            var classGuid = Guid.Parse(classId);
            var teacherGuid = Guid.Parse(teacherId);
            
            var lesson = await _context.Lessons
                .FirstOrDefaultAsync(l => l.Id == lessonGuid && l.CreatedByUserId == teacherGuid);
            var teacherClass = await _context.Classes
                .FirstOrDefaultAsync(c => c.Id == classGuid && c.TeacherId == teacherGuid);

            if (lesson == null || teacherClass == null) return false;

            var existingAssignment = await _context.ClassLessons
                .FirstOrDefaultAsync(cl => cl.ClassId == classGuid && cl.LessonId == lessonGuid);

            if (existingAssignment != null) return false; // Already assigned

            var classLesson = new ClassLesson
            {
                ClassId = classGuid,
                LessonId = lessonGuid,
                AssignedAt = DateTime.UtcNow,
                IsRequired = true
            };

            _context.ClassLessons.Add(classLesson);
            await _context.SaveChangesAsync();
            return true;
        }

        // Quiz Management
        public async Task<Quiz> CreateQuizForLessonAsync(string lessonId, string teacherId, string title, 
            string description, int timeLimit = 30)
        {
            var lessonGuid = Guid.Parse(lessonId);
            var teacherGuid = Guid.Parse(teacherId);
            
            var lesson = await _context.Lessons
                .FirstOrDefaultAsync(l => l.Id == lessonGuid && l.CreatedByUserId == teacherGuid);

            if (lesson == null) throw new ArgumentException("Lesson not found or not owned by teacher");

            var quiz = new Quiz
            {
                LessonId = lessonGuid,
                Title = title,
                Description = description,
                TimeLimit = timeLimit,
                CreatedAt = DateTime.UtcNow,
                CreatedByUserId = teacherGuid,
                IsPublished = false
            };

            _context.Quizzes.Add(quiz);
            await _context.SaveChangesAsync();
            return quiz;
        }

        public async Task<bool> AddQuestionToQuizAsync(string quizId, string teacherId, string questionText, 
            QuestionType type, List<(string text, bool isCorrect)> options)
        {
            var quizGuid = Guid.Parse(quizId);
            var teacherGuid = Guid.Parse(teacherId);
            
            var quiz = await _context.Quizzes
                .Include(q => q.Lesson)
                .FirstOrDefaultAsync(q => q.Id == quizGuid && q.Lesson.CreatedByUserId == teacherGuid);

            if (quiz == null) return false;

            var question = new QuizQuestion
            {
                QuizId = quizGuid,
                QuestionText = questionText,
                Type = type,
                OrderIndex = await _context.QuizQuestions.CountAsync(qq => qq.QuizId == quizGuid) + 1
            };

            _context.QuizQuestions.Add(question);
            await _context.SaveChangesAsync();

            // Add options for multiple choice questions
            if (type == QuestionType.MultipleChoice && options.Any())
            {
                var questionOptions = options.Select((option, index) => new QuizOption
                {
                    QuestionId = question.Id,
                    OptionText = option.text,
                    IsCorrect = option.isCorrect,
                    OrderIndex = index + 1
                }).ToList();

                _context.QuizOptions.AddRange(questionOptions);
                await _context.SaveChangesAsync();
            }

            return true;
        }

        // Student Progress Monitoring
        public async Task<List<StudentProgress>> GetClassProgressAsync(string classId, string teacherId)
        {
            var classGuid = Guid.Parse(classId);
            var teacherGuid = Guid.Parse(teacherId);
            
            var teacherClass = await _context.Classes
                .FirstOrDefaultAsync(c => c.Id == classGuid && c.TeacherId == teacherGuid);

            if (teacherClass == null) return new List<StudentProgress>();

            return await _context.StudentProgresses
                .Include(sp => sp.User)
                .Include(sp => sp.Lesson)
                .Where(sp => _context.ClassEnrollments
                    .Any(ce => ce.ClassId == classGuid && ce.StudentId == sp.UserId))
                .OrderBy(sp => sp.User.FirstName)
                .ThenBy(sp => sp.Lesson.Title)
                .ToListAsync();
        }

        public async Task<List<QuizAttempt>> GetClassQuizAttemptsAsync(string classId, string teacherId)
        {
            var classGuid = Guid.Parse(classId);
            var teacherGuid = Guid.Parse(teacherId);
            
            var teacherClass = await _context.Classes
                .FirstOrDefaultAsync(c => c.Id == classGuid && c.TeacherId == teacherGuid);

            if (teacherClass == null) return new List<QuizAttempt>();

            return await _context.QuizAttempts
                .Include(qa => qa.User)
                .Include(qa => qa.Quiz)
                    .ThenInclude(q => q.Lesson)
                .Where(qa => _context.ClassEnrollments
                    .Any(ce => ce.ClassId == classGuid && ce.StudentId == qa.UserId))
                .OrderByDescending(qa => qa.StartedAt)
                .ToListAsync();
        }

        // AI Content Generation
        public async Task<string> GenerateLessonContentAsync(string topic, LessonDifficulty difficulty)
        {
            var prompt = $"Create a comprehensive programming lesson about '{topic}' for {difficulty.ToString().ToLower()} level students. " +
                        "Include explanations, examples, and practical exercises. Format it in HTML with proper headings and code blocks.";
            
            return await _geminiService.GenerateLessonContentAsync(topic, difficulty);
        }

        public async Task<List<QuizQuestion>> GenerateQuizQuestionsAsync(string lessonContent, int questionCount = 5)
        {
            return await _geminiService.GenerateQuizQuestionsAsync(lessonContent, questionCount);
        }

        // Utility Methods
        private string GenerateClassCode()
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            var random = new Random();
            return new string(Enumerable.Repeat(chars, 6)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        }

        public async Task<object> GetTeacherDashboardDataAsync(string teacherId)
        {
            var classes = await GetTeacherClassesAsync(teacherId);
            var lessons = await GetTeacherLessonsAsync(teacherId);
            
            var totalStudents = classes.SelectMany(c => c.Enrollments).Count();
            var publishedLessons = lessons.Count(l => l.IsPublished);
            var recentActivity = await GetRecentActivityAsync(teacherId);

            return new
            {
                TotalClasses = classes.Count,
                TotalStudents = totalStudents,
                TotalLessons = lessons.Count,
                PublishedLessons = publishedLessons,
                Classes = classes.Take(5),
                RecentLessons = lessons.Take(5),
                RecentActivity = recentActivity
            };
        }

        private async Task<List<object>> GetRecentActivityAsync(string teacherId)
        {
            var teacherGuid = Guid.Parse(teacherId);
            
            var recentProgress = await _context.StudentProgresses
                .Include(sp => sp.User)
                .Include(sp => sp.Lesson)
                .Where(sp => sp.Lesson.CreatedByUserId == teacherGuid)
                .OrderByDescending(sp => sp.LastAccessedAt)
                .Take(10)
                .Select(sp => new
                {
                    Type = "Progress",
                    StudentName = sp.User.FirstName + " " + sp.User.LastName,
                    LessonTitle = sp.Lesson.Title,
                    Status = sp.Status.ToString(),
                    Date = sp.LastAccessedAt
                })
                .ToListAsync();

            return recentProgress.Cast<object>().ToList();
        }
    }
}