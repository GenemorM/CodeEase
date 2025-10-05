using Microsoft.EntityFrameworkCore;
using CodeEase.Models;

namespace CodeEase.Data
{
    public class CodeEaseDbContext : DbContext
    {
        public CodeEaseDbContext(DbContextOptions<CodeEaseDbContext> options) : base(options)
        {
        }
        
        public DbSet<User> Users { get; set; }
        public DbSet<Lesson> Lessons { get; set; }
        public DbSet<Quiz> Quizzes { get; set; }
        public DbSet<QuizQuestion> QuizQuestions { get; set; }
        public DbSet<QuizOption> QuizOptions { get; set; }
        public DbSet<StudentProgress> StudentProgresses { get; set; }
        public DbSet<QuizAttempt> QuizAttempts { get; set; }
        public DbSet<QuizAnswer> QuizAnswers { get; set; }
        public DbSet<Class> Classes { get; set; }
        public DbSet<ClassEnrollment> ClassEnrollments { get; set; }
        public DbSet<ClassLesson> ClassLessons { get; set; }
        public DbSet<QuizAssignment> QuizAssignments { get; set; }
        
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // User entity configuration
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Username).IsUnique();
                entity.HasIndex(e => e.Email).IsUnique();
                entity.Property(e => e.Role).HasConversion<int>();
            });
            
            // Lesson entity configuration
            modelBuilder.Entity<Lesson>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.CreatedBy)
                      .WithMany()
                      .HasForeignKey(e => e.CreatedByUserId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.Property(e => e.Difficulty).HasConversion<int>();
            });
            
            // Quiz entity configuration
            modelBuilder.Entity<Quiz>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.Lesson)
                      .WithMany(l => l.Quizzes)
                      .HasForeignKey(e => e.LessonId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.CreatedBy)
                      .WithMany()
                      .HasForeignKey(e => e.CreatedByUserId)
                      .OnDelete(DeleteBehavior.Restrict);
            });
            
            // QuizQuestion entity configuration
            modelBuilder.Entity<QuizQuestion>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.Quiz)
                      .WithMany(q => q.Questions)
                      .HasForeignKey(e => e.QuizId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.Property(e => e.Type).HasConversion<int>();
            });
            
            // QuizOption entity configuration
            modelBuilder.Entity<QuizOption>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.Question)
                      .WithMany(q => q.Options)
                      .HasForeignKey(e => e.QuestionId)
                      .OnDelete(DeleteBehavior.Cascade);
            });
            
            // StudentProgress entity configuration
            modelBuilder.Entity<StudentProgress>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.User)
                      .WithMany(u => u.StudentProgresses)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Lesson)
                      .WithMany(l => l.StudentProgresses)
                      .HasForeignKey(e => e.LessonId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.Property(e => e.Status).HasConversion<int>();
                entity.HasIndex(e => new { e.UserId, e.LessonId }).IsUnique();
            });
            
            // QuizAttempt entity configuration
            modelBuilder.Entity<QuizAttempt>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.User)
                      .WithMany(u => u.QuizAttempts)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Quiz)
                      .WithMany(q => q.Attempts)
                      .HasForeignKey(e => e.QuizId)
                      .OnDelete(DeleteBehavior.Cascade);
            });
            
            // QuizAnswer entity configuration
            modelBuilder.Entity<QuizAnswer>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.Attempt)
                      .WithMany(a => a.Answers)
                      .HasForeignKey(e => e.AttemptId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Question)
                      .WithMany(q => q.Answers)
                      .HasForeignKey(e => e.QuestionId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.SelectedOption)
                      .WithMany()
                      .HasForeignKey(e => e.SelectedOptionId)
                      .OnDelete(DeleteBehavior.SetNull);
            });
            
            // Class entity configuration
            modelBuilder.Entity<Class>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.Teacher)
                      .WithMany(u => u.TeachingClasses)
                      .HasForeignKey(e => e.TeacherId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasIndex(e => e.ClassCode).IsUnique();
            });
            
            // ClassEnrollment entity configuration
            modelBuilder.Entity<ClassEnrollment>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.Class)
                      .WithMany(c => c.Enrollments)
                      .HasForeignKey(e => e.ClassId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Student)
                      .WithMany(u => u.ClassEnrollments)
                      .HasForeignKey(e => e.StudentId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(e => new { e.ClassId, e.StudentId }).IsUnique();
            });
            
            // ClassLesson entity configuration
            modelBuilder.Entity<ClassLesson>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.Class)
                      .WithMany(c => c.ClassLessons)
                      .HasForeignKey(e => e.ClassId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Lesson)
                      .WithMany(l => l.ClassLessons)
                      .HasForeignKey(e => e.LessonId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(e => new { e.ClassId, e.LessonId }).IsUnique();
            });
            
            // QuizAssignment entity configuration
            modelBuilder.Entity<QuizAssignment>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.Quiz)
                      .WithMany()
                      .HasForeignKey(e => e.QuizId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Class)
                      .WithMany()
                      .HasForeignKey(e => e.ClassId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.AssignedBy)
                      .WithMany()
                      .HasForeignKey(e => e.AssignedByUserId)
                      .OnDelete(DeleteBehavior.Restrict);
            });
        }
    }
}