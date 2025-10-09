using Mscc.GenerativeAI;
using CodeEase.Models;

namespace CodeEase.Services
{
    public class GeminiService
    {
        private readonly GenerativeModel _model;
        private readonly ILogger<GeminiService> _logger;

        public GeminiService(IConfiguration configuration, ILogger<GeminiService> logger)
        {
            _logger = logger;
            var apiKey = configuration["Gemini:ApiKey"];
            
            if (string.IsNullOrEmpty(apiKey))
            {
                throw new ArgumentException("Gemini API key is not configured");
            }

            var googleAI = new GoogleAI(apiKey);
            _model = googleAI.GenerativeModel();
        }

        public async Task<string> GenerateLessonContentAsync(string topic, LessonDifficulty difficulty)
        {
            try
            {
                var prompt = $@"
Create a comprehensive ASP.NET Core programming lesson on the topic: '{topic}' 
for {difficulty} level students.

The lesson should include:
1. Clear explanation of the concept
2. Practical code examples with comments
3. Step-by-step implementation guide
4. Common pitfalls and best practices
5. Real-world use cases

Format the response as structured content suitable for a learning platform.
Focus on practical, hands-on learning with working code examples.
";

                var response = await _model.GenerateContent(prompt);
                return response.Text ?? string.Empty;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating lesson content for topic: {Topic}", topic);
                throw;
            }
        }

        public async Task<List<QuizQuestion>> GenerateQuizQuestionsAsync(string lessonContent, int questionCount = 5)
        {
            try
            {
                var prompt = $@"
Based on the following lesson content, generate {questionCount} multiple-choice quiz questions:

{lessonContent}

For each question, provide:
1. A clear, specific question about the lesson content
2. 4 multiple choice options (A, B, C, D)
3. The correct answer
4. A brief explanation of why the answer is correct

Format the response as JSON with this structure:
{{
  ""questions"": [
    {{
      ""question"": ""Question text here"",
      ""options"": [
        ""Option A text"",
        ""Option B text"", 
        ""Option C text"",
        ""Option D text""
      ],
      ""correctAnswer"": 0,
      ""explanation"": ""Explanation text""
    }}
  ]
}}

Make sure questions test understanding, not just memorization.
";

                var response = await _model.GenerateContent(prompt);
                var jsonResponse = response.Text ?? string.Empty;
                
                // Parse the JSON response and convert to QuizQuestion objects
                var questions = ParseQuizQuestionsFromJson(jsonResponse);
                return questions;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating quiz questions");
                throw;
            }
        }

        public async Task<string> ValidateCodeAsync(string code, string expectedOutput = "")
        {
            try
            {
                var prompt = $@"
Analyze the following ASP.NET Core code for:
1. Syntax errors
2. Logic errors
3. Best practices violations
4. Security issues
5. Performance concerns

Code to analyze:
```csharp
{code}
```

{(string.IsNullOrEmpty(expectedOutput) ? "" : $"Expected output: {expectedOutput}")}

Provide feedback in this format:
- Issues Found: List any problems
- Suggestions: Recommendations for improvement
- Rating: Score from 1-10 (10 being perfect)
- Corrected Code: If needed, provide the corrected version
";

                var response = await _model.GenerateContent(prompt);
                return response.Text ?? string.Empty;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating code");
                throw;
            }
        }

        public async Task<string> GenerateCodeExampleAsync(string concept, LessonDifficulty difficulty)
        {
            try
            {
                var prompt = $@"
Generate a practical ASP.NET Core code example demonstrating: {concept}
Difficulty level: {difficulty}

Requirements:
1. Complete, working code that can be compiled
2. Include necessary using statements
3. Add helpful comments explaining key concepts
4. Follow ASP.NET Core best practices
5. Include error handling where appropriate

Make the example educational and easy to understand for {difficulty} level students.
";

                var response = await _model.GenerateContent(prompt);
                return response.Text ?? string.Empty;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating code example for concept: {Concept}", concept);
                throw;
            }
        }

        public async Task<string> GetLearningRecommendationsAsync(string studentLevel, List<string> completedTopics)
        {
            try
            {
                var completedTopicsText = string.Join(", ", completedTopics);
                var prompt = $@"
Based on a student's current level ({studentLevel}) and completed topics ({completedTopicsText}), 
recommend the next 5 ASP.NET Core topics they should learn.

Consider:
1. Logical progression of concepts
2. Building upon previously learned material
3. Practical relevance for web development
4. Industry best practices

Format as a numbered list with brief explanations for each recommendation.
";

                var response = await _model.GenerateContent(prompt);
                return response.Text ?? string.Empty;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating learning recommendations");
                throw;
            }
        }

        private List<QuizQuestion> ParseQuizQuestionsFromJson(string jsonResponse)
        {
            var questions = new List<QuizQuestion>();
            
            try
            {
                // Simple JSON parsing - in production, use System.Text.Json or Newtonsoft.Json
                // This is a simplified implementation for demonstration
                
                // For now, return a sample question structure
                // TODO: Implement proper JSON parsing
                questions.Add(new QuizQuestion
                {
                    QuestionText = "Sample question from AI",
                    Type = QuestionType.MultipleChoice,
                    Options = new List<QuizOption>
                    {
                        new QuizOption { OptionText = "Option A", IsCorrect = true },
                        new QuizOption { OptionText = "Option B", IsCorrect = false },
                        new QuizOption { OptionText = "Option C", IsCorrect = false },
                        new QuizOption { OptionText = "Option D", IsCorrect = false }
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error parsing quiz questions JSON");
                // Return empty list on parsing error
            }

            return questions;
        }
    }
}