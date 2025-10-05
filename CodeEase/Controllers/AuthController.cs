using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CodeEase.Services;
using CodeEase.Models;

namespace CodeEase.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(AuthService authService, ILogger<AuthController> logger)
        {
            _authService = authService;
            _logger = logger;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.RegisterAsync(request);

            if (!result.Success)
            {
                return BadRequest(new { message = result.Message });
            }

            return Ok(new
            {
                message = "Registration successful",
                user = new
                {
                    id = result.User!.Id,
                    username = result.User.Username,
                    email = result.User.Email,
                    firstName = result.User.FirstName,
                    lastName = result.User.LastName,
                    role = result.User.Role.ToString()
                },
                accessToken = result.AccessToken,
                refreshToken = result.RefreshToken,
                expiresAt = result.ExpiresAt
            });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.LoginAsync(request);

            if (!result.Success)
            {
                return Unauthorized(new { message = result.Message });
            }

            return Ok(new
            {
                message = "Login successful",
                user = new
                {
                    id = result.User!.Id,
                    username = result.User.Username,
                    email = result.User.Email,
                    firstName = result.User.FirstName,
                    lastName = result.User.LastName,
                    role = result.User.Role.ToString()
                },
                accessToken = result.AccessToken,
                refreshToken = result.RefreshToken,
                expiresAt = result.ExpiresAt
            });
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            
            if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized();
            }

            var user = await _authService.GetUserByIdAsync(userId);
            
            if (user == null)
            {
                return NotFound();
            }

            return Ok(new
            {
                id = user.Id,
                username = user.Username,
                email = user.Email,
                firstName = user.FirstName,
                lastName = user.LastName,
                role = user.Role.ToString(),
                createdAt = user.CreatedAt
            });
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            
            if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized();
            }

            var success = await _authService.ChangePasswordAsync(userId, request.CurrentPassword, request.NewPassword);

            if (!success)
            {
                return BadRequest(new { message = "Current password is incorrect or user not found." });
            }

            return Ok(new { message = "Password changed successfully." });
        }

        [HttpPost("logout")]
        [Authorize]
        public IActionResult Logout()
        {
            // In a real application, you might want to blacklist the token
            // For now, we'll just return success as the client should discard the token
            return Ok(new { message = "Logout successful." });
        }
    }

    public class ChangePasswordRequest
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}