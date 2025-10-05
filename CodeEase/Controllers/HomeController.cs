using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using CodeEase.Models;

namespace CodeEase.Controllers;

public class HomeController : Controller
{
    private readonly ILogger<HomeController> _logger;

    public HomeController(ILogger<HomeController> logger)
    {
        _logger = logger;
    }

    public IActionResult Index()
    {
        return View();
    }

    public IActionResult Lessons()
        {
            return View();
        }

        public IActionResult CodeRunner()
    {
        return View();
    }

    public IActionResult Student()
        {
            return View();
        }

        public IActionResult Teacher()
        {
            return View();
        }

    public IActionResult Privacy()
    {
        return View();
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
