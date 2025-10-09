// Analytics functionality for teacher dashboard
class Analytics {
    constructor() {
        this.currentData = null;
        this.init();
    }

    init() {
        // Load classes for filter dropdown
        this.loadClassesForAnalytics();
    }

    async loadClassesForAnalytics() {
        try {
            const response = await fetch('/api/teacher/classes', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const classes = await response.json();
                const select = document.getElementById('analyticsClassSelect');
                
                // Clear existing options except "All Classes"
                select.innerHTML = '<option value="">All Classes</option>';
                
                classes.forEach(cls => {
                    const option = document.createElement('option');
                    option.value = cls.id;
                    option.textContent = cls.name;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading classes for analytics:', error);
        }
    }

    async loadQuizSummaries() {
        try {
            const classId = document.getElementById('analyticsClassSelect').value;
            const dateRange = document.getElementById('analyticsDateRange').value;
            
            let url = '/api/teacher/quiz-summaries';
            const params = new URLSearchParams();
            
            if (classId) params.append('classId', classId);
            if (dateRange) params.append('days', dateRange);
            
            if (params.toString()) {
                url += '?' + params.toString();
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.currentData = data;
                this.displayQuizSummaries(data);
                this.updateQuickStats(data);
            } else {
                throw new Error('Failed to load quiz summaries');
            }
        } catch (error) {
            console.error('Error loading quiz summaries:', error);
            this.showError('Failed to load analytics data. Please try again.');
        }
    }

    displayQuizSummaries(summaries) {
        const container = document.getElementById('quizSummariesContainer');
        
        if (!summaries || summaries.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-chart-bar fa-3x mb-3"></i>
                    <p>No quiz data available for the selected filters.</p>
                </div>
            `;
            return;
        }

        const html = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead class="table-light">
                        <tr>
                            <th>Quiz Title</th>
                            <th>Lesson</th>
                            <th>Total Attempts</th>
                            <th>Completed</th>
                            <th>Average Score</th>
                            <th>Completion Rate</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${summaries.map(quiz => `
                            <tr>
                                <td>
                                    <strong>${this.escapeHtml(quiz.title)}</strong>
                                    <br>
                                    <small class="text-muted">${quiz.totalQuestions} questions</small>
                                </td>
                                <td>${this.escapeHtml(quiz.lessonTitle || 'N/A')}</td>
                                <td>
                                    <span class="badge bg-primary">${quiz.totalAttempts}</span>
                                </td>
                                <td>
                                    <span class="badge bg-success">${quiz.completedAttempts}</span>
                                </td>
                                <td>
                                    <span class="badge ${this.getScoreBadgeClass(quiz.averageScore)}">
                                        ${quiz.averageScore.toFixed(1)}%
                                    </span>
                                </td>
                                <td>
                                    <div class="progress" style="height: 20px;">
                                        <div class="progress-bar ${this.getProgressBarClass(quiz.completionRate)}" 
                                             role="progressbar" 
                                             style="width: ${quiz.completionRate}%"
                                             aria-valuenow="${quiz.completionRate}" 
                                             aria-valuemin="0" 
                                             aria-valuemax="100">
                                            ${quiz.completionRate.toFixed(1)}%
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <button class="btn btn-sm btn-outline-info" 
                                            onclick="analytics.viewDetailedAnalytics(${quiz.quizId})"
                                            title="View Detailed Analytics">
                                        <i class="fas fa-chart-line"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    updateQuickStats(summaries) {
        if (!summaries || summaries.length === 0) {
            document.getElementById('totalQuizzes').textContent = '0';
            document.getElementById('totalAttempts').textContent = '0';
            document.getElementById('averageScore').textContent = '0%';
            document.getElementById('completionRate').textContent = '0%';
            return;
        }

        const totalQuizzes = summaries.length;
        const totalAttempts = summaries.reduce((sum, quiz) => sum + quiz.totalAttempts, 0);
        const totalCompleted = summaries.reduce((sum, quiz) => sum + quiz.completedAttempts, 0);
        
        const averageScore = summaries.length > 0 
            ? summaries.reduce((sum, quiz) => sum + quiz.averageScore, 0) / summaries.length 
            : 0;
        
        const completionRate = totalAttempts > 0 ? (totalCompleted / totalAttempts) * 100 : 0;

        document.getElementById('totalQuizzes').textContent = totalQuizzes;
        document.getElementById('totalAttempts').textContent = totalAttempts;
        document.getElementById('averageScore').textContent = averageScore.toFixed(1) + '%';
        document.getElementById('completionRate').textContent = completionRate.toFixed(1) + '%';
    }

    async viewDetailedAnalytics(quizId) {
        try {
            const response = await fetch(`/api/teacher/quiz/${quizId}/analytics`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const analytics = await response.json();
                this.showDetailedAnalyticsModal(analytics);
            } else {
                throw new Error('Failed to load detailed analytics');
            }
        } catch (error) {
            console.error('Error loading detailed analytics:', error);
            this.showError('Failed to load detailed analytics. Please try again.');
        }
    }

    showDetailedAnalyticsModal(analytics) {
        // Use the existing quiz analytics modal from quiz-manager.js
        if (window.quizManager && window.quizManager.showAnalyticsModal) {
            window.quizManager.showAnalyticsModal(analytics);
        } else {
            console.error('Quiz manager not available for detailed analytics');
        }
    }

    async exportAnalyticsReport() {
        if (!this.currentData || this.currentData.length === 0) {
            this.showError('No data available to export. Please load analytics data first.');
            return;
        }

        try {
            // Create CSV content
            const csvContent = this.generateCSVReport(this.currentData);
            
            // Create and download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `quiz-analytics-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showSuccess('Analytics report exported successfully!');
        } catch (error) {
            console.error('Error exporting report:', error);
            this.showError('Failed to export report. Please try again.');
        }
    }

    generateCSVReport(data) {
        const headers = [
            'Quiz Title',
            'Lesson',
            'Total Questions',
            'Total Attempts',
            'Completed Attempts',
            'Average Score (%)',
            'Completion Rate (%)',
            'Created Date'
        ];

        const rows = data.map(quiz => [
            `"${quiz.title.replace(/"/g, '""')}"`,
            `"${(quiz.lessonTitle || 'N/A').replace(/"/g, '""')}"`,
            quiz.totalQuestions,
            quiz.totalAttempts,
            quiz.completedAttempts,
            quiz.averageScore.toFixed(2),
            quiz.completionRate.toFixed(2),
            new Date(quiz.createdAt).toLocaleDateString()
        ]);

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    getScoreBadgeClass(score) {
        if (score >= 80) return 'bg-success';
        if (score >= 60) return 'bg-warning';
        return 'bg-danger';
    }

    getProgressBarClass(rate) {
        if (rate >= 80) return 'bg-success';
        if (rate >= 60) return 'bg-warning';
        return 'bg-danger';
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    showError(message) {
        // Use existing toast functionality if available
        if (window.showToast) {
            window.showToast(message, 'error');
        } else {
            alert(message);
        }
    }

    showSuccess(message) {
        // Use existing toast functionality if available
        if (window.showToast) {
            window.showToast(message, 'success');
        } else {
            alert(message);
        }
    }
}

// Global functions for HTML onclick handlers
function loadQuizSummaries() {
    if (window.analytics) {
        window.analytics.loadQuizSummaries();
    }
}

function exportAnalyticsReport() {
    if (window.analytics) {
        window.analytics.exportAnalyticsReport();
    }
}

// Initialize analytics when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('analytics')) {
        window.analytics = new Analytics();
    }
});