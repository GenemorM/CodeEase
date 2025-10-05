using System.ComponentModel.DataAnnotations;

namespace CodeEase.Models
{
    public class QuizAssignment
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid QuizId { get; set; }
        public virtual Quiz Quiz { get; set; } = null!;
        
        public Guid ClassId { get; set; }
        public virtual Class Class { get; set; } = null!;
        
        public DateTime? DueDate { get; set; }
        
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
        
        public Guid AssignedByUserId { get; set; }
        public virtual User AssignedBy { get; set; } = null!;
        
        public bool IsActive { get; set; } = true;
    }
}