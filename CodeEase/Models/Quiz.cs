using System.ComponentModel.DataAnnotations;

namespace CodeEase.Models
{
    public class Quiz
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;
        
        public string? Description { get; set; }
        
        public Guid LessonId { get; set; }
        public virtual Lesson Lesson { get; set; } = null!;
        
        public int TimeLimit { get; set; } // in minutes, 0 = no limit
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        public Guid CreatedByUserId { get; set; }
        public virtual User CreatedBy { get; set; } = null!;
        
        public bool IsPublished { get; set; } = false;
        public bool IsAiGenerated { get; set; } = false;
        
        // Navigation properties
        public virtual ICollection<QuizQuestion> Questions { get; set; } = new List<QuizQuestion>();
        public virtual ICollection<QuizAttempt> Attempts { get; set; } = new List<QuizAttempt>();
    }
    
    public class QuizQuestion
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid QuizId { get; set; }
        public virtual Quiz Quiz { get; set; } = null!;
        
        [Required]
        public string QuestionText { get; set; } = string.Empty;
        
        public QuestionType Type { get; set; }
        
        public string? CodeSnippet { get; set; }
        
        public int OrderIndex { get; set; }
        
        public int Points { get; set; } = 1;
        
        // Navigation properties
        public virtual ICollection<QuizOption> Options { get; set; } = new List<QuizOption>();
        public virtual ICollection<QuizAnswer> Answers { get; set; } = new List<QuizAnswer>();
    }
    
    public class QuizOption
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid QuestionId { get; set; }
        public virtual QuizQuestion Question { get; set; } = null!;
        
        [Required]
        public string OptionText { get; set; } = string.Empty;
        
        public bool IsCorrect { get; set; }
        
        public int OrderIndex { get; set; }
    }
    
    public enum QuestionType
    {
        MultipleChoice = 1,
        TrueFalse = 2,
        CodeCompletion = 3,
        ShortAnswer = 4
    }
}