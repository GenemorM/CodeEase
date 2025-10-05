using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using CodeEase.Data;
using CodeEase.Models;
using CodeEase.Security;

namespace CodeEase.Services
{
    public class AuthService
    {
        private readonly CodeEaseDbContext _context;
        private readonly JwtTokenService _tokenService;
        private readonly ILogger<AuthService> _logger;

        public AuthService(CodeEaseDbContext context, JwtTokenService tokenService, ILogger<AuthService> logger)
        {
            _context = context;
            _tokenService = tokenService;
            _logger = logger;
        }

        public async Task<AuthResult> RegisterAsync(RegisterRequest request)
        {
            try
            {
                // Check if user already exists
                if (await _context.Users.AnyAsync(u => u.Username == request.Username || u.Email == request.Email))
                {
                    return new AuthResult { Success = false, Message = "User with this username or email already exists." };
                }

                // Create new user
                var user = new User
                {
                    Username = request.Username,
                    Email = request.Email,
                    FirstName = request.FirstName,
                    LastName = request.LastName,
                    Role = request.Role,
                    PasswordHash = HashPassword(request.Password),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                var tokens = _tokenService.GenerateTokens(user);

                _logger.LogInformation("User {Username} registered successfully", user.Username);

                return new AuthResult
                {
                    Success = true,
                    User = user,
                    AccessToken = tokens.AccessToken,
                    RefreshToken = tokens.RefreshToken,
                    ExpiresAt = tokens.ExpiresAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error registering user {Username}", request.Username);
                return new AuthResult { Success = false, Message = "An error occurred during registration." };
            }
        }

        public async Task<AuthResult> LoginAsync(LoginRequest request)
        {
            try
            {
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => (u.Username == request.UsernameOrEmail || u.Email == request.UsernameOrEmail) && u.IsActive);

                if (user == null || !VerifyPassword(request.Password, user.PasswordHash))
                {
                    return new AuthResult { Success = false, Message = "Invalid username/email or password." };
                }

                var tokens = _tokenService.GenerateTokens(user);

                _logger.LogInformation("User {Username} logged in successfully", user.Username);

                return new AuthResult
                {
                    Success = true,
                    User = user,
                    AccessToken = tokens.AccessToken,
                    RefreshToken = tokens.RefreshToken,
                    ExpiresAt = tokens.ExpiresAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error logging in user {UsernameOrEmail}", request.UsernameOrEmail);
                return new AuthResult { Success = false, Message = "An error occurred during login." };
            }
        }

        public async Task<User?> GetUserByIdAsync(Guid userId)
        {
            return await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);
        }

        public async Task<bool> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword)
        {
            try
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);
                if (user == null || !VerifyPassword(currentPassword, user.PasswordHash))
                {
                    return false;
                }

                user.PasswordHash = HashPassword(newPassword);
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Password changed for user {Username}", user.Username);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing password for user {UserId}", userId);
                return false;
            }
        }

        private string HashPassword(string password)
        {
            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password + "CodeEase_Salt_2024"));
            return Convert.ToBase64String(hashedBytes);
        }

        private bool VerifyPassword(string password, string hashedPassword)
        {
            var hashedInput = HashPassword(password);
            return hashedInput == hashedPassword;
        }
    }

    public class RegisterRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public UserRole Role { get; set; } = UserRole.Student;
    }

    public class LoginRequest
    {
        public string UsernameOrEmail { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class AuthResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public User? User { get; set; }
        public string AccessToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
    }
}