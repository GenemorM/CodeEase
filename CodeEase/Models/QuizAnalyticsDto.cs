namespace CodeEase.Models
{
    public class QuizAnalyticsDto
    {
        public Guid QuizId { get; set; }
        public string QuizTitle { get; set; } = string.Empty;
        public int TotalQuestions { get; set; }
        public int TotalAttempts { get; set; }
        public int CompletedAttempts { get; set; }
        public int UniqueStudents { get; set; }
        public double AverageScore { get; set; }
        public double HighestScore { get; set; }
        public double LowestScore { get; set; }
        public double AverageTimeSpent { get; set; }
        public List<StudentPerformanceDto> StudentPerformances { get; set; } = new List<StudentPerformanceDto>();
        public List<QuestionAnalyticsDto> QuestionAnalytics { get; set; } = new List<QuestionAnalyticsDto>();
    }

    public class StudentPerformanceDto
    {
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public int AttemptCount { get; set; }
        public double BestScore { get; set; }
        public double LatestScore { get; set; }
        public double TimeSpent { get; set; }
    }

    public class QuestionAnalyticsDto
    {
        public Guid QuestionId { get; set; }
        public string QuestionText { get; set; } = string.Empty;
        public string QuestionType { get; set; } = string.Empty;
        public int TotalAnswers { get; set; }
        public int CorrectAnswers { get; set; }
        public double SuccessRate { get; set; }
    }

    public class QuizSummaryDto
    {
        public Guid QuizId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string LessonTitle { get; set; } = string.Empty;
        public bool IsPublished { get; set; }
        public DateTime CreatedAt { get; set; }
        public int TotalAttempts { get; set; }
        public int CompletedAttempts { get; set; }
        public double AverageScore { get; set; }
    }
}