// Global notification function that uses the showToast function from auth.js
function showNotification(message, type = 'info') {
    if (typeof showToast === 'function') {
        showToast(message, type);
    } else {
        // Fallback to console if showToast is not available
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// Teacher Dashboard JavaScript
class TeacherDashboard {
    constructor() {
        this.currentClassId = null;
        this.currentLessonId = null;
        this.generatedContent = null;
        this.generatedQuestions = [];
        this.init();
    }

    init() {
        this.loadDashboardData();
        this.setupEventListeners();
        this.setupTabs();
    }

    setupEventListeners() {
        // Form submissions
        document.getElementById('createClassForm').addEventListener('submit', (e) => this.handleCreateClass(e));
        document.getElementById('createLessonForm').addEventListener('submit', (e) => this.handleCreateLesson(e));
        document.getElementById('generateLessonForm').addEventListener('submit', (e) => this.handleGenerateLesson(e));
        document.getElementById('generateQuizForm').addEventListener('submit', (e) => this.handleGenerateQuiz(e));

        // AI content buttons
        document.getElementById('useGeneratedContent').addEventListener('click', () => this.useGeneratedContent());
        document.getElementById('useGeneratedQuestions').addEventListener('click', () => this.useGeneratedQuestions());

        // Progress class selection
        document.getElementById('progressClassSelect').addEventListener('change', (e) => this.loadClassProgress(e.target.value));

        // Search functionality
        document.getElementById('lessonSearch').addEventListener('input', (e) => this.searchLessons(e.target.value));
    }

    setupTabs() {
        const tabs = document.querySelectorAll('#teacherTabs button[data-bs-toggle="tab"]');
        tabs.forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const target = e.target.getAttribute('data-bs-target');
                this.handleTabChange(target);
            });
        });
    }

    handleTabChange(target) {
        switch (target) {
            case '#classes':
                this.loadClasses();
                break;
            case '#lessons':
                this.loadLessons();
                break;
            case '#progress':
                this.loadProgressClasses();
                break;
            case '#ai-tools':
                this.loadAIToolsData();
                break;
        }
    }

    async loadDashboardData() {
        try {
            const response = await makeAuthenticatedRequest('/api/teacher/dashboard');
            
            if (response.ok) {
                const data = await response.json();
                this.updateDashboardStats(data);
            } else {
                const error = await response.json();
                showNotification(error.message || 'Error loading dashboard data', 'error');
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            showNotification('Error loading dashboard data', 'error');
        }
    }

    updateDashboardStats(data) {
        document.getElementById('totalClasses').textContent = data.totalClasses || 0;
        document.getElementById('totalStudents').textContent = data.totalStudents || 0;
        document.getElementById('totalLessons').textContent = data.totalLessons || 0;
        document.getElementById('publishedLessons').textContent = data.publishedLessons || 0;
    }

    async loadClasses() {
        try {
            const response = await makeAuthenticatedRequest('/api/teacher/classes');
            if (response.ok) {
                const classes = await response.json();
                this.renderClasses(classes);
            }
        } catch (error) {
            console.error('Error loading classes:', error);
            showNotification('Error loading classes', 'error');
        }
    }

    renderClasses(classes) {
        const container = document.getElementById('classesContainer');
        if (classes.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="fas fa-users fa-3x text-muted mb-3"></i>
                        <h4>No Classes Yet</h4>
                        <p class="text-muted">Create your first class to get started!</p>
                        <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#createClassModal">
                            <i class="fas fa-plus me-1"></i>Create Class
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = classes.map(cls => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card class-card h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title">${cls.name}</h5>
                            <div class="dropdown">
                                <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="dropdown">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item" href="#" onclick="teacherDashboard.viewClass(${cls.id})">
                                        <i class="fas fa-eye me-1"></i>View Details
                                    </a></li>
                                    <li><a class="dropdown-item" href="#" onclick="teacherDashboard.editClass(${cls.id})">
                                        <i class="fas fa-edit me-1"></i>Edit
                                    </a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item text-danger" href="#" onclick="teacherDashboard.deleteClass(${cls.id})">
                                        <i class="fas fa-trash me-1"></i>Delete
                                    </a></li>
                                </ul>
                            </div>
                        </div>
                        <p class="card-text text-muted">${cls.description || 'No description'}</p>
                        <div class="row text-center">
                            <div class="col-6">
                                <small class="text-muted">Students</small>
                                <div class="fw-bold">${cls.enrollments?.length || 0}</div>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">Lessons</small>
                                <div class="fw-bold">${cls.classLessons?.length || 0}</div>
                            </div>
                        </div>
                        <div class="mt-3">
                            <small class="text-muted">Class Code: </small>
                            <code class="bg-light px-2 py-1 rounded">${cls.classCode}</code>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async loadLessons() {
        try {
            const response = await makeAuthenticatedRequest('/api/teacher/lessons');
            if (response.ok) {
                const lessons = await response.json();
                this.renderLessons(lessons);
            }
        } catch (error) {
            console.error('Error loading lessons:', error);
            showNotification('Error loading lessons', 'error');
        }
    }

    renderLessons(lessons) {
        const container = document.getElementById('lessonsContainer');
        if (lessons.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="fas fa-book fa-3x text-muted mb-3"></i>
                        <h4>No Lessons Yet</h4>
                        <p class="text-muted">Create your first lesson to get started!</p>
                        <button class="btn btn-success" data-bs-toggle="modal" data-bs-target="#createLessonModal">
                            <i class="fas fa-plus me-1"></i>Create Lesson
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = lessons.map(lesson => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card lesson-card h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title">${lesson.title}</h5>
                            <div class="dropdown">
                                <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="dropdown">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item" href="#" onclick="teacherDashboard.viewLesson(${lesson.id})">
                                        <i class="fas fa-eye me-1"></i>View Details
                                    </a></li>
                                    <li><a class="dropdown-item" href="#" onclick="teacherDashboard.editLesson(${lesson.id})">
                                        <i class="fas fa-edit me-1"></i>Edit
                                    </a></li>
                                    ${!lesson.isPublished ? `
                                    <li><a class="dropdown-item" href="#" onclick="teacherDashboard.publishLesson(${lesson.id})">
                                        <i class="fas fa-upload me-1"></i>Publish
                                    </a></li>
                                    ` : ''}
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item" href="#" onclick="teacherDashboard.createQuizForLesson(${lesson.id})">
                                        <i class="fas fa-question-circle me-1"></i>Add Quiz
                                    </a></li>
                                </ul>
                            </div>
                        </div>
                        <p class="card-text text-muted">${lesson.description || 'No description'}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge difficulty-badge ${this.getDifficultyClass(lesson.difficulty)}">
                                ${this.getDifficultyText(lesson.difficulty)}
                            </span>
                            <span class="badge ${lesson.isPublished ? 'bg-success' : 'bg-warning'}">
                                ${lesson.isPublished ? 'Published' : 'Draft'}
                            </span>
                        </div>
                        <small class="text-muted">Created: ${new Date(lesson.createdAt).toLocaleDateString()}</small>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async loadProgressClasses() {
        try {
            const response = await makeAuthenticatedRequest('/api/teacher/classes');
            if (response.ok) {
                const classes = await response.json();
                const select = document.getElementById('progressClassSelect');
                select.innerHTML = '<option value="">Select a class to view progress...</option>' +
                    classes.map(cls => `<option value="${cls.id}">${cls.name}</option>`).join('');
            }
        } catch (error) {
            console.error('Error loading progress classes:', error);
        }
    }

    async loadClassProgress(classId) {
        if (!classId) {
            document.getElementById('progressContainer').innerHTML = '';
            return;
        }

        try {
            const response = await makeAuthenticatedRequest(`/api/teacher/classes/${classId}/progress`);
            if (response.ok) {
                const progress = await response.json();
                this.renderClassProgress(progress);
            }
        } catch (error) {
            console.error('Error loading class progress:', error);
            showNotification('Error loading class progress', 'error');
        }
    }

    renderClassProgress(progress) {
        const container = document.getElementById('progressContainer');
        if (progress.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-chart-line fa-3x text-muted mb-3"></i>
                    <h5>No Progress Data</h5>
                    <p class="text-muted">Students haven't started any lessons yet.</p>
                </div>
            `;
            return;
        }

        // Group progress by student
        const studentProgress = {};
        progress.forEach(p => {
            const studentName = `${p.user.firstName} ${p.user.lastName}`;
            if (!studentProgress[studentName]) {
                studentProgress[studentName] = [];
            }
            studentProgress[studentName].push(p);
        });

        container.innerHTML = `
            <div class="row">
                ${Object.entries(studentProgress).map(([studentName, lessons]) => `
                    <div class="col-md-6 mb-4">
                        <div class="card">
                            <div class="card-header">
                                <h6 class="mb-0">${studentName}</h6>
                            </div>
                            <div class="card-body">
                                ${lessons.map(lesson => `
                                    <div class="progress-item">
                                        <div class="d-flex justify-content-between align-items-center mb-1">
                                            <small class="fw-bold">${lesson.lesson.title}</small>
                                            <span class="badge ${this.getStatusClass(lesson.status)}">
                                                ${this.getStatusText(lesson.status)}
                                            </span>
                                        </div>
                                        <div class="progress mb-2" style="height: 6px;">
                                            <div class="progress-bar" role="progressbar" 
                                                 style="width: ${lesson.completionPercentage}%"
                                                 aria-valuenow="${lesson.completionPercentage}" 
                                                 aria-valuemin="0" aria-valuemax="100">
                                            </div>
                                        </div>
                                        <small class="text-muted">
                                            ${lesson.completionPercentage}% complete
                                            ${lesson.completedAt ? ` • Completed ${new Date(lesson.completedAt).toLocaleDateString()}` : ''}
                                        </small>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async loadAIToolsData() {
        // Load lessons for quiz generation
        try {
            const response = await makeAuthenticatedRequest('/api/teacher/lessons');
            if (response.ok) {
                const lessons = await response.json();
                const select = document.getElementById('quizLessonSelect');
                select.innerHTML = '<option value="">Choose a lesson...</option>' +
                    lessons.filter(l => l.isPublished).map(l => `<option value="${l.id}">${l.title}</option>`).join('');
            }
        } catch (error) {
            console.error('Error loading lessons for AI tools:', error);
        }
    }

    // Event Handlers
    async handleCreateClass(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('className') || document.getElementById('className').value,
            description: formData.get('classDescription') || document.getElementById('classDescription').value
        };

        const isUpdate = this.currentClassId !== null;
        const url = isUpdate ? `/api/teacher/classes/${this.currentClassId}` : '/api/teacher/classes';
        const method = isUpdate ? 'PUT' : 'POST';
        const loadingText = isUpdate ? 'Updating class...' : 'Creating class...';
        const successMessage = isUpdate ? 'Class updated successfully!' : 'Class created successfully!';

        try {
            this.showLoading(loadingText);
            const response = await makeAuthenticatedRequest(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                showNotification(successMessage, 'success');
                bootstrap.Modal.getInstance(document.getElementById('createClassModal')).hide();
                e.target.reset();
                
                // Reset modal state
                this.resetCreateClassModal();
                
                this.loadClasses();
                this.loadDashboardData();
            } else {
                const error = await response.json();
                showNotification(error.message || `Error ${isUpdate ? 'updating' : 'creating'} class`, 'error');
            }
        } catch (error) {
            console.error(`Error ${isUpdate ? 'updating' : 'creating'} class:`, error);
            showNotification(`Error ${isUpdate ? 'updating' : 'creating'} class`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    resetCreateClassModal() {
        // Reset modal to create mode
        const modal = document.getElementById('createClassModal');
        const title = modal.querySelector('.modal-title');
        const submitBtn = modal.querySelector('button[type="submit"]');
        
        title.textContent = 'Create New Class';
        submitBtn.textContent = 'Create Class';
        
        // Clear the current class ID
        this.currentClassId = null;
    }

    async handleCreateLesson(e) {
        e.preventDefault();
        const data = {
            title: document.getElementById('lessonTitle').value,
            description: document.getElementById('lessonDescription').value,
            content: document.getElementById('lessonContent').value,
            difficulty: parseInt(document.getElementById('lessonDifficulty').value),
            codeExamples: document.getElementById('lessonCodeExamples').value || null
        };

        const isUpdate = this.currentLessonId !== null;
        const url = isUpdate ? `/api/teacher/lessons/${this.currentLessonId}` : '/api/teacher/lessons';
        const method = isUpdate ? 'PUT' : 'POST';
        const loadingText = isUpdate ? 'Updating lesson...' : 'Creating lesson...';
        const successMessage = isUpdate ? 'Lesson updated successfully!' : 'Lesson created successfully!';

        try {
            this.showLoading(loadingText);
            const response = await makeAuthenticatedRequest(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                showNotification(successMessage, 'success');
                bootstrap.Modal.getInstance(document.getElementById('createLessonModal')).hide();
                e.target.reset();
                
                // Reset modal state
                this.resetCreateLessonModal();
                
                this.loadLessons();
                this.loadDashboardData();
            } else {
                const error = await response.json();
                showNotification(error.message || `Error ${isUpdate ? 'updating' : 'creating'} lesson`, 'error');
            }
        } catch (error) {
            console.error(`Error ${isUpdate ? 'updating' : 'creating'} lesson:`, error);
            showNotification(`Error ${isUpdate ? 'updating' : 'creating'} lesson`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    resetCreateLessonModal() {
        this.currentLessonId = null;
        document.querySelector('#createLessonModal .modal-title').textContent = 'Create New Lesson';
        document.querySelector('#createLessonModal .btn-primary').textContent = 'Create Lesson';
    }

    async handleGenerateLesson(e) {
        e.preventDefault();
        const topic = document.getElementById('lessonTopic').value;
        const difficulty = parseInt(document.getElementById('lessonDifficulty').value);

        try {
            this.showLoading('Generating lesson content...');
            const response = await makeAuthenticatedRequest('/api/teacher/ai/generate-lesson', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, difficulty })
            });

            if (response.ok) {
                const data = await response.json();
                this.generatedContent = data.content;
                document.getElementById('contentPreview').innerHTML = data.content;
                document.getElementById('generatedContent').style.display = 'block';
                showNotification('Content generated successfully!', 'success');
            } else {
                const error = await response.json();
                showNotification(error.message || 'Error generating content', 'error');
            }
        } catch (error) {
            console.error('Error generating lesson:', error);
            showNotification('Error generating lesson content', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleGenerateQuiz(e) {
        e.preventDefault();
        const lessonId = document.getElementById('quizLessonSelect').value;
        const questionCount = parseInt(document.getElementById('questionCount').value);

        if (!lessonId) {
            showNotification('Please select a lesson', 'warning');
            return;
        }

        try {
            // First get the lesson content
            const lessonResponse = await makeAuthenticatedRequest(`/api/teacher/lessons/${lessonId}`);
            if (!lessonResponse.ok) {
                showNotification('Error loading lesson content', 'error');
                return;
            }

            const lesson = await lessonResponse.json();
            
            this.showLoading('Generating quiz questions...');
            const response = await makeAuthenticatedRequest('/api/teacher/ai/generate-quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    lessonContent: lesson.content, 
                    questionCount 
                })
            });

            if (response.ok) {
                const questions = await response.json();
                this.generatedQuestions = questions;
                this.renderGeneratedQuestions(questions);
                document.getElementById('generatedQuestions').style.display = 'block';
                showNotification('Questions generated successfully!', 'success');
            } else {
                const error = await response.json();
                showNotification(error.message || 'Error generating questions', 'error');
            }
        } catch (error) {
            console.error('Error generating quiz:', error);
            showNotification('Error generating quiz questions', 'error');
        } finally {
            this.hideLoading();
        }
    }

    renderGeneratedQuestions(questions) {
        const container = document.getElementById('questionsPreview');
        container.innerHTML = questions.map((q, index) => `
            <div class="card mb-2">
                <div class="card-body">
                    <h6>Question ${index + 1}</h6>
                    <p>${q.questionText}</p>
                    <div class="row">
                        ${q.options.map((option, optIndex) => `
                            <div class="col-md-6">
                                <small class="${option.isCorrect ? 'text-success fw-bold' : 'text-muted'}">
                                    ${String.fromCharCode(65 + optIndex)}. ${option.text}
                                    ${option.isCorrect ? ' ✓' : ''}
                                </small>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    }

    useGeneratedContent() {
        if (this.generatedContent) {
            document.getElementById('lessonContent').value = this.generatedContent;
            bootstrap.Modal.getOrCreateInstance(document.getElementById('createLessonModal')).show();
            document.getElementById('generatedContent').style.display = 'none';
        }
    }

    useGeneratedQuestions() {
        // This would typically open a quiz creation modal
        // For now, we'll just show a notification
        showNotification('Quiz questions ready! Create a quiz to add them.', 'info');
        document.getElementById('generatedQuestions').style.display = 'none';
    }

    // Utility Methods
    getDifficultyClass(difficulty) {
        const classes = ['bg-success', 'bg-warning', 'bg-danger'];
        return classes[difficulty] || 'bg-secondary';
    }

    getDifficultyText(difficulty) {
        const texts = ['Beginner', 'Intermediate', 'Advanced'];
        return texts[difficulty] || 'Unknown';
    }

    getStatusClass(status) {
        const classes = {
            0: 'bg-secondary', // NotStarted
            1: 'bg-primary',   // InProgress
            2: 'bg-success'    // Completed
        };
        return classes[status] || 'bg-secondary';
    }

    getStatusText(status) {
        const texts = {
            0: 'Not Started',
            1: 'In Progress',
            2: 'Completed'
        };
        return texts[status] || 'Unknown';
    }

    searchLessons(query) {
        const lessons = document.querySelectorAll('#lessonsContainer .lesson-card');
        lessons.forEach(lesson => {
            const title = lesson.querySelector('.card-title').textContent.toLowerCase();
            const description = lesson.querySelector('.card-text').textContent.toLowerCase();
            const matches = title.includes(query.toLowerCase()) || description.includes(query.toLowerCase());
            lesson.closest('.col-md-6').style.display = matches ? 'block' : 'none';
        });
    }

    showLoading(text = 'Loading...') {
        document.getElementById('loadingText').textContent = text;
        bootstrap.Modal.getOrCreateInstance(document.getElementById('loadingModal')).show();
    }

    hideLoading() {
        bootstrap.Modal.getInstance(document.getElementById('loadingModal'))?.hide();
    }

    // Placeholder methods for future implementation
    async viewClass(classId) {
        try {
            this.showLoading('Loading class details...');
            
            const response = await makeAuthenticatedRequest(`/api/teacher/classes/${classId}`);
            if (response.ok) {
                const classData = await response.json();
                this.showClassDetails(classData);
            } else {
                const error = await response.json();
                showNotification(error.message || 'Error loading class details', 'error');
            }
        } catch (error) {
            console.error('Error loading class details:', error);
            showNotification('Error loading class details', 'error');
        } finally {
            this.hideLoading();
        }
    }

    showClassDetails(classData) {
        const modal = document.getElementById('classDetailModal');
        const title = document.getElementById('classDetailTitle');
        const content = document.getElementById('classDetailContent');

        title.textContent = classData.name;

        content.innerHTML = `
            <div class="row">
                <div class="col-md-8">
                    <h6>Class Information</h6>
                    <table class="table table-borderless">
                        <tr>
                            <td><strong>Name:</strong></td>
                            <td>${classData.name}</td>
                        </tr>
                        <tr>
                            <td><strong>Description:</strong></td>
                            <td>${classData.description || 'No description provided'}</td>
                        </tr>
                        <tr>
                            <td><strong>Created:</strong></td>
                            <td>${new Date(classData.createdAt).toLocaleDateString()}</td>
                        </tr>
                        <tr>
                            <td><strong>Total Students:</strong></td>
                            <td>${classData.enrollments?.length || 0}</td>
                        </tr>
                    </table>
                </div>
                <div class="col-md-4">
                    <div class="d-grid gap-2">
                        <button class="btn btn-primary" onclick="teacherDashboard.editClass('${classData.id}')">
                            <i class="fas fa-edit me-1"></i>Edit Class
                        </button>
                        <button class="btn btn-info" onclick="teacherDashboard.loadClassProgress('${classData.id}')">
                            <i class="fas fa-chart-line me-1"></i>View Progress
                        </button>
                        <button class="btn btn-danger" onclick="teacherDashboard.deleteClass('${classData.id}')">
                            <i class="fas fa-trash me-1"></i>Delete Class
                        </button>
                    </div>
                </div>
            </div>
            
            <hr>
            
            <h6>Enrolled Students</h6>
            ${classData.enrollments && classData.enrollments.length > 0 ? `
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Student Name</th>
                                <th>Email</th>
                                <th>Enrolled Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${classData.enrollments.map(enrollment => `
                                <tr>
                                    <td>${enrollment.student?.firstName || 'N/A'} ${enrollment.student?.lastName || ''}</td>
                                    <td>${enrollment.student?.email || 'N/A'}</td>
                                    <td>${new Date(enrollment.enrolledAt).toLocaleDateString()}</td>
                                    <td>
                                        <button class="btn btn-sm btn-outline-primary" onclick="teacherDashboard.viewStudentProgress('${enrollment.studentId}', '${classData.id}')">
                                            <i class="fas fa-chart-line"></i> Progress
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : `
                <div class="text-center py-4">
                    <i class="fas fa-users fa-3x text-muted mb-3"></i>
                    <h5>No Students Enrolled</h5>
                    <p class="text-muted">This class doesn't have any enrolled students yet.</p>
                </div>
            `}
        `;

        bootstrap.Modal.getOrCreateInstance(modal).show();
    }

    async editClass(classId) {
        try {
            this.showLoading('Loading class data...');
            
            const response = await makeAuthenticatedRequest(`/api/teacher/classes/${classId}`);
            if (response.ok) {
                const classData = await response.json();
                this.showEditClassModal(classData);
            } else {
                const error = await response.json();
                showNotification(error.message || 'Error loading class data', 'error');
            }
        } catch (error) {
            console.error('Error loading class data:', error);
            showNotification('Error loading class data', 'error');
        } finally {
            this.hideLoading();
        }
    }

    showEditClassModal(classData) {
        // Close the detail modal first
        bootstrap.Modal.getInstance(document.getElementById('classDetailModal'))?.hide();
        
        // Populate the create class modal with existing data
        document.getElementById('className').value = classData.name;
        document.getElementById('classDescription').value = classData.description || '';
        
        // Change modal title and button text
        const modal = document.getElementById('createClassModal');
        const title = modal.querySelector('.modal-title');
        const submitBtn = modal.querySelector('button[type="submit"]');
        
        title.textContent = 'Edit Class';
        submitBtn.textContent = 'Update Class';
        
        // Store the class ID for the update
        this.currentClassId = classData.id;
        
        bootstrap.Modal.getOrCreateInstance(modal).show();
    }

    async deleteClass(classId) {
        if (confirm('Are you sure you want to delete this class? This action cannot be undone and will remove all student enrollments.')) {
            try {
                this.showLoading('Deleting class...');
                
                const response = await makeAuthenticatedRequest(`/api/teacher/classes/${classId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    showNotification('Class deleted successfully!', 'success');
                    
                    // Close any open modals
                    bootstrap.Modal.getInstance(document.getElementById('classDetailModal'))?.hide();
                    
                    // Refresh the classes list and dashboard
                    this.loadClasses();
                    this.loadDashboardData();
                } else {
                    const error = await response.json();
                    showNotification(error.message || 'Error deleting class', 'error');
                }
            } catch (error) {
                console.error('Error deleting class:', error);
                showNotification('Error deleting class', 'error');
            } finally {
                this.hideLoading();
            }
        }
    }

    async viewStudentProgress(studentId, classId) {
        try {
            this.showLoading('Loading student progress...');
            
            const response = await makeAuthenticatedRequest(`/api/teacher/students/${studentId}/progress?classId=${classId}`);
            if (response.ok) {
                const progressData = await response.json();
                this.showStudentProgressModal(progressData);
            } else {
                const error = await response.json();
                showNotification(error.message || 'Error loading student progress', 'error');
            }
        } catch (error) {
            console.error('Error loading student progress:', error);
            showNotification('Error loading student progress', 'error');
        } finally {
            this.hideLoading();
        }
    }

    showStudentProgressModal(progressData) {
        // Create a new modal for student progress
        const modalHtml = `
            <div class="modal fade" id="studentProgressModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Student Progress: ${progressData.studentName}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${progressData.progress && progressData.progress.length > 0 ? `
                                <div class="table-responsive">
                                    <table class="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>Lesson</th>
                                                <th>Status</th>
                                                <th>Progress</th>
                                                <th>Last Accessed</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${progressData.progress.map(p => `
                                                <tr>
                                                    <td>${p.lesson?.title || 'N/A'}</td>
                                                    <td>
                                                        <span class="badge bg-${this.getStatusColor(p.status)}">
                                                            ${p.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div class="progress" style="height: 20px;">
                                                            <div class="progress-bar" role="progressbar" 
                                                                 style="width: ${p.progressPercentage || 0}%">
                                                                ${p.progressPercentage || 0}%
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>${p.lastAccessedAt ? new Date(p.lastAccessedAt).toLocaleDateString() : 'Never'}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            ` : `
                                <div class="text-center py-4">
                                    <i class="fas fa-chart-line fa-3x text-muted mb-3"></i>
                                    <h5>No Progress Data</h5>
                                    <p class="text-muted">This student hasn't started any lessons yet.</p>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if it exists
        const existingModal = document.getElementById('studentProgressModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add new modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Show the modal
        bootstrap.Modal.getOrCreateInstance(document.getElementById('studentProgressModal')).show();
    }

    getStatusColor(status) {
        switch (status?.toLowerCase()) {
            case 'completed': return 'success';
            case 'in_progress': return 'warning';
            case 'not_started': return 'secondary';
            default: return 'secondary';
        }
    }

    async viewLesson(lessonId) {
        try {
            this.showLoading('Loading lesson details...');
            const response = await makeAuthenticatedRequest(`/api/teacher/lessons/${lessonId}`);
            
            if (response.ok) {
                const lessonData = await response.json();
                this.showLessonDetails(lessonData);
            } else {
                const error = await response.json();
                showNotification(error.message || 'Error loading lesson details', 'error');
            }
        } catch (error) {
            console.error('Error loading lesson:', error);
            showNotification('Error loading lesson details', 'error');
        } finally {
            this.hideLoading();
        }
    }

    showLessonDetails(lessonData) {
        const modalBody = document.querySelector('#lessonDetailModal .modal-body');
        modalBody.innerHTML = `
            <div class="row">
                <div class="col-md-8">
                    <h6>Lesson Information</h6>
                    <table class="table table-borderless">
                        <tr>
                            <td><strong>Title:</strong></td>
                            <td>${lessonData.title}</td>
                        </tr>
                        <tr>
                            <td><strong>Description:</strong></td>
                            <td>${lessonData.description || 'No description provided'}</td>
                        </tr>
                        <tr>
                            <td><strong>Difficulty:</strong></td>
                            <td>
                                <span class="badge bg-${this.getDifficultyColor(lessonData.difficulty)}">
                                    ${lessonData.difficulty}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td><strong>Status:</strong></td>
                            <td>
                                <span class="badge bg-${lessonData.isPublished ? 'success' : 'warning'}">
                                    ${lessonData.isPublished ? 'Published' : 'Draft'}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td><strong>Created:</strong></td>
                            <td>${new Date(lessonData.createdAt).toLocaleDateString()}</td>
                        </tr>
                        <tr>
                            <td><strong>Last Updated:</strong></td>
                            <td>${new Date(lessonData.updatedAt).toLocaleDateString()}</td>
                        </tr>
                    </table>
                </div>
                <div class="col-md-4">
                    <div class="d-grid gap-2">
                        <button class="btn btn-primary" onclick="teacherDashboard.editLesson('${lessonData.id}')">
                            <i class="fas fa-edit me-1"></i>Edit Lesson
                        </button>
                        <button class="btn btn-info" onclick="teacherDashboard.createQuizForLesson('${lessonData.id}')">
                            <i class="fas fa-question-circle me-1"></i>Create Quiz
                        </button>
                        ${!lessonData.isPublished ? `
                            <button class="btn btn-success" onclick="teacherDashboard.publishLesson('${lessonData.id}')">
                                <i class="fas fa-share me-1"></i>Publish Lesson
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <hr>
            
            <h6>Content Preview</h6>
            <div class="card">
                <div class="card-body">
                    <div class="content-preview" style="max-height: 300px; overflow-y: auto;">
                        ${lessonData.content ? lessonData.content.substring(0, 500) + (lessonData.content.length > 500 ? '...' : '') : 'No content available'}
                    </div>
                </div>
            </div>
            
            ${lessonData.codeExamples ? `
                <hr>
                <h6>Code Examples</h6>
                <div class="card">
                    <div class="card-body">
                        <pre><code>${lessonData.codeExamples}</code></pre>
                    </div>
                </div>
            ` : ''}
        `;
        
        bootstrap.Modal.getOrCreateInstance(document.getElementById('lessonDetailModal')).show();
    }

    getDifficultyColor(difficulty) {
        switch (difficulty?.toLowerCase()) {
            case 'beginner': return 'success';
            case 'intermediate': return 'warning';
            case 'advanced': return 'danger';
            default: return 'secondary';
        }
    }

    async editLesson(lessonId) {
        try {
            this.showLoading('Loading lesson for editing...');
            const response = await makeAuthenticatedRequest(`/api/teacher/lessons/${lessonId}`);
            
            if (response.ok) {
                const lessonData = await response.json();
                this.showEditLessonModal(lessonData);
            } else {
                const error = await response.json();
                showNotification(error.message || 'Error loading lesson for editing', 'error');
            }
        } catch (error) {
            console.error('Error loading lesson for editing:', error);
            showNotification('Error loading lesson for editing', 'error');
        } finally {
            this.hideLoading();
        }
    }

    showEditLessonModal(lessonData) {
        // Set current lesson ID for update operation
        this.currentLessonId = lessonData.id;
        
        // Populate the create lesson modal with existing data
        document.getElementById('lessonTitle').value = lessonData.title;
        document.getElementById('lessonDescription').value = lessonData.description || '';
        document.getElementById('lessonContent').value = lessonData.content || '';
        document.getElementById('lessonCodeExamples').value = lessonData.codeExamples || '';
        document.getElementById('lessonDifficulty').value = lessonData.difficulty;
        
        // Update modal title and button text
        document.querySelector('#createLessonModal .modal-title').textContent = 'Edit Lesson';
        document.querySelector('#createLessonModal .btn-primary').textContent = 'Update Lesson';
        
        // Show the modal
        bootstrap.Modal.getOrCreateInstance(document.getElementById('createLessonModal')).show();
    }

    resetCreateLessonModal() {
        this.currentLessonId = null;
        document.querySelector('#createLessonModal .modal-title').textContent = 'Create New Lesson';
        document.querySelector('#createLessonModal .btn-primary').textContent = 'Create Lesson';
    }

    async createQuizForLesson(lessonId) {
        try {
            this.showLoading('Loading quiz creation...');
            
            // For now, show a placeholder modal - this would be expanded with full quiz creation functionality
            const modalHtml = `
                <div class="modal fade" id="createQuizModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Create Quiz for Lesson</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="createQuizForm">
                                    <div class="mb-3">
                                        <label for="quizTitle" class="form-label">Quiz Title</label>
                                        <input type="text" class="form-control" id="quizTitle" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="quizDescription" class="form-label">Description</label>
                                        <textarea class="form-control" id="quizDescription" rows="3"></textarea>
                                    </div>
                                    <div class="mb-3">
                                        <label for="quizTimeLimit" class="form-label">Time Limit (minutes)</label>
                                        <input type="number" class="form-control" id="quizTimeLimit" value="30" min="5" max="180">
                                    </div>
                                    <div class="alert alert-info">
                                        <i class="fas fa-info-circle me-2"></i>
                                        Quiz creation with questions will be available in the next update. 
                                        For now, you can create the quiz structure.
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" onclick="teacherDashboard.handleCreateQuiz('${lessonId}')">
                                    Create Quiz Structure
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Remove existing modal if it exists
            const existingModal = document.getElementById('createQuizModal');
            if (existingModal) {
                existingModal.remove();
            }

            // Add new modal to body
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Show the modal
            bootstrap.Modal.getOrCreateInstance(document.getElementById('createQuizModal')).show();
            
        } catch (error) {
            console.error('Error creating quiz modal:', error);
            showNotification('Error opening quiz creation', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleCreateQuiz(lessonId) {
        const formData = {
            title: document.getElementById('quizTitle').value,
            description: document.getElementById('quizDescription').value,
            timeLimit: parseInt(document.getElementById('quizTimeLimit').value)
        };

        if (!formData.title.trim()) {
            showNotification('Quiz title is required', 'error');
            return;
        }

        try {
            this.showLoading('Creating quiz...');
            
            // This would call the actual quiz creation API when implemented
            // For now, just show a success message
            showNotification('Quiz structure created! Question management coming soon.', 'success');
            bootstrap.Modal.getInstance(document.getElementById('createQuizModal')).hide();
            
        } catch (error) {
            console.error('Error creating quiz:', error);
            showNotification('Error creating quiz', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async publishLesson(lessonId) {
        try {
            const response = await makeAuthenticatedRequest(`/api/teacher/lessons/${lessonId}/publish`, {
                method: 'POST'
            });

            if (response.ok) {
                showNotification('Lesson published successfully!', 'success');
                this.loadLessons();
                this.loadDashboardData();
            } else {
                const error = await response.json();
                showNotification(error.message || 'Error publishing lesson', 'error');
            }
        } catch (error) {
            console.error('Error publishing lesson:', error);
            showNotification('Error publishing lesson', 'error');
        }
    }

    async createQuizForLesson(lessonId) {
        showNotification('Quiz creation modal coming soon!', 'info');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.teacherDashboard = new TeacherDashboard();
});