using System.ComponentModel.DataAnnotations;

namespace CodeEase.Models
{
    public class StudentProgress
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid UserId { get; set; }
        public virtual User User { get; set; } = null!;
        
        public Guid LessonId { get; set; }
        public virtual Lesson Lesson { get; set; } = null!;
        
        public ProgressStatus Status { get; set; }
        
        public DateTime StartedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }
        public DateTime LastAccessedAt { get; set; } = DateTime.UtcNow;
        
        public int TimeSpentMinutes { get; set; } = 0;
        public double CompletionPercentage { get; set; } = 0.0;
        
        public string? Notes { get; set; }
    }
    
    public class QuizAttempt
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid UserId { get; set; }
        public virtual User User { get; set; } = null!;
        
        public Guid QuizId { get; set; }
        public virtual Quiz Quiz { get; set; } = null!;
        
        public DateTime StartedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }
        
        public int Score { get; set; } = 0;
        public int MaxScore { get; set; } = 0;
        public double Percentage { get; set; } = 0.0;
        
        public bool IsCompleted { get; set; } = false;
        public int AttemptNumber { get; set; } = 1;
        
        // Navigation properties
        public virtual ICollection<QuizAnswer> Answers { get; set; } = new List<QuizAnswer>();
    }
    
    public class QuizAnswer
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid AttemptId { get; set; }
        public virtual QuizAttempt Attempt { get; set; } = null!;
        
        public Guid QuestionId { get; set; }
        public virtual QuizQuestion Question { get; set; } = null!;
        
        public string? AnswerText { get; set; }
        public Guid? SelectedOptionId { get; set; }
        public virtual QuizOption? SelectedOption { get; set; }
        
        public bool IsCorrect { get; set; }
        public int PointsEarned { get; set; } = 0;
        
        public DateTime AnsweredAt { get; set; } = DateTime.UtcNow;
    }
    
    public enum ProgressStatus
    {
        NotStarted = 0,
        InProgress = 1,
        Completed = 2,
        Paused = 3
    }
}