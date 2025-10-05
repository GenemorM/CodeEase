using System.ComponentModel.DataAnnotations;

namespace CodeEase.Models
{
    public class Class
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;
        
        public string? Description { get; set; }
        
        public Guid TeacherId { get; set; }
        public virtual User Teacher { get; set; } = null!;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        public bool IsActive { get; set; } = true;
        
        [StringLength(20)]
        public string? ClassCode { get; set; } // For easy student enrollment
        
        // Navigation properties
        public virtual ICollection<ClassEnrollment> Enrollments { get; set; } = new List<ClassEnrollment>();
        public virtual ICollection<ClassLesson> ClassLessons { get; set; } = new List<ClassLesson>();
    }
    
    public class ClassEnrollment
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid ClassId { get; set; }
        public virtual Class Class { get; set; } = null!;
        
        public Guid StudentId { get; set; }
        public virtual User Student { get; set; } = null!;
        
        public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;
        public bool IsActive { get; set; } = true;
    }
    
    public class ClassLesson
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid ClassId { get; set; }
        public virtual Class Class { get; set; } = null!;
        
        public Guid LessonId { get; set; }
        public virtual Lesson Lesson { get; set; } = null!;
        
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
        public DateTime? DueDate { get; set; }
        
        public int OrderIndex { get; set; }
        public bool IsRequired { get; set; } = true;
    }
}