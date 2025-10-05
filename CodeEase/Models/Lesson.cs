using System.ComponentModel.DataAnnotations;

namespace CodeEase.Models
{
    public class Lesson
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;
        
        public string? Description { get; set; }
        
        [Required]
        public string Content { get; set; } = string.Empty; // JSON or HTML content
        
        public string? CodeExamples { get; set; } // JSON array of code examples
        
        public int OrderIndex { get; set; }
        
        public LessonDifficulty Difficulty { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        public Guid CreatedByUserId { get; set; }
        public virtual User CreatedBy { get; set; } = null!;
        
        public bool IsPublished { get; set; } = false;
        public bool IsAiGenerated { get; set; } = false;
        
        // Navigation properties
        public virtual ICollection<StudentProgress> StudentProgresses { get; set; } = new List<StudentProgress>();
        public virtual ICollection<Quiz> Quizzes { get; set; } = new List<Quiz>();
        public virtual ICollection<ClassLesson> ClassLessons { get; set; } = new List<ClassLesson>();
    }
    
    public enum LessonDifficulty
    {
        Beginner = 1,
        Intermediate = 2,
        Advanced = 3
    }
}