// Lessons management JavaScript
let allLessons = [];
let currentLesson = null;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    loadLessons();
});

// Load all lessons
async function loadLessons() {
    try {
        showSpinner();
        const response = await makeAuthenticatedRequest('/api/lesson', 'GET');
        
        if (response.ok) {
            allLessons = await response.json();
            displayLessons(allLessons);
        } else {
            showToast('Error loading lessons', 'error');
        }
    } catch (error) {
        console.error('Error loading lessons:', error);
        showToast('Error loading lessons', 'error');
    } finally {
        hideSpinner();
    }
}

// Display lessons in grid
function displayLessons(lessons) {
    const container = document.getElementById('lessonsContainer');
    const emptyState = document.getElementById('emptyState');
    
    if (lessons.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    container.innerHTML = lessons.map(lesson => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card lesson-card h-100" onclick="viewLesson(${lesson.id})">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span class="badge bg-${getDifficultyColor(lesson.difficulty)}">
                        ${getDifficultyText(lesson.difficulty)}
                    </span>
                    ${lesson.isAiGenerated ? '<i class="fas fa-magic text-success" title="AI Generated"></i>' : ''}
                    ${lesson.isPublished ? '<i class="fas fa-eye text-primary" title="Published"></i>' : '<i class="fas fa-eye-slash text-muted" title="Draft"></i>'}
                </div>
                <div class="card-body">
                    <h5 class="card-title">${escapeHtml(lesson.title)}</h5>
                    <p class="card-text text-muted">${escapeHtml(lesson.description)}</p>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <small class="text-muted">
                            <i class="fas fa-calendar me-1"></i>
                            ${formatDate(lesson.createdAt)}
                        </small>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="event.stopPropagation(); viewLesson(${lesson.id})" title="View">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-outline-success" onclick="event.stopPropagation(); editLesson(${lesson.id})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-info" onclick="event.stopPropagation(); generateQuizForLesson(${lesson.id})" title="Generate Quiz">
                                <i class="fas fa-question-circle"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Filter lessons
function filterLessons() {
    const difficultyFilter = document.getElementById('difficultyFilter').value;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const showAiGenerated = document.getElementById('showAiGenerated').checked;
    
    let filteredLessons = allLessons.filter(lesson => {
        const matchesDifficulty = !difficultyFilter || lesson.difficulty.toString() === difficultyFilter;
        const matchesSearch = !searchTerm || 
            lesson.title.toLowerCase().includes(searchTerm) || 
            lesson.description.toLowerCase().includes(searchTerm);
        const matchesAiFilter = showAiGenerated || !lesson.isAiGenerated;
        
        return matchesDifficulty && matchesSearch && matchesAiFilter;
    });
    
    displayLessons(filteredLessons);
}

// Show create lesson modal
function showCreateLessonModal() {
    // Reset form
    document.getElementById('createLessonForm').reset();
    
    // Set next order index
    const maxOrder = allLessons.length > 0 ? Math.max(...allLessons.map(l => l.orderIndex)) : 0;
    document.getElementById('lessonOrderIndex').value = maxOrder + 1;
    
    const modal = new bootstrap.Modal(document.getElementById('createLessonModal'));
    modal.show();
}

// Create lesson
async function createLesson() {
    const form = document.getElementById('createLessonForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const lessonData = {
        title: document.getElementById('lessonTitle').value,
        description: document.getElementById('lessonDescription').value,
        content: document.getElementById('lessonContent').value,
        codeExamples: document.getElementById('lessonCodeExamples').value,
        difficulty: parseInt(document.getElementById('lessonDifficulty').value),
        orderIndex: parseInt(document.getElementById('lessonOrderIndex').value),
        isPublished: document.getElementById('lessonIsPublished').checked
    };
    
    try {
        showButtonSpinner('Create Lesson');
        const response = await makeAuthenticatedRequest('/api/lesson', 'POST', lessonData);
        
        if (response.ok) {
            showToast('Lesson created successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('createLessonModal')).hide();
            loadLessons(); // Reload lessons
        } else {
            const error = await response.text();
            showToast(`Error creating lesson: ${error}`, 'error');
        }
    } catch (error) {
        console.error('Error creating lesson:', error);
        showToast('Error creating lesson', 'error');
    } finally {
        hideButtonSpinner('Create Lesson');
    }
}

// Show generate lesson modal
function showGenerateLessonModal() {
    document.getElementById('generateLessonForm').reset();
    const modal = new bootstrap.Modal(document.getElementById('generateLessonModal'));
    modal.show();
}

// Generate lesson using AI
async function generateLesson() {
    const form = document.getElementById('generateLessonForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const generateData = {
        topic: document.getElementById('generateTopic').value,
        difficulty: parseInt(document.getElementById('generateDifficulty').value)
    };
    
    try {
        showButtonSpinner('Generate Lesson');
        showToast('AI is generating your lesson... This may take a moment.', 'info');
        
        const response = await makeAuthenticatedRequest('/api/lesson/generate', 'POST', generateData);
        
        if (response.ok) {
            const newLesson = await response.json();
            showToast('Lesson generated successfully! Review and publish when ready.', 'success');
            bootstrap.Modal.getInstance(document.getElementById('generateLessonModal')).hide();
            loadLessons(); // Reload lessons
            
            // Automatically open the generated lesson for review
            setTimeout(() => viewLesson(newLesson.id), 1000);
        } else {
            const error = await response.text();
            showToast(`Error generating lesson: ${error}`, 'error');
        }
    } catch (error) {
        console.error('Error generating lesson:', error);
        showToast('Error generating lesson', 'error');
    } finally {
        hideButtonSpinner('Generate Lesson');
    }
}

// View lesson details
async function viewLesson(lessonId) {
    try {
        const response = await makeAuthenticatedRequest(`/api/lesson/${lessonId}`, 'GET');
        
        if (response.ok) {
            currentLesson = await response.json();
            displayLessonDetail(currentLesson);
            
            const modal = new bootstrap.Modal(document.getElementById('lessonDetailModal'));
            modal.show();
        } else {
            showToast('Error loading lesson details', 'error');
        }
    } catch (error) {
        console.error('Error loading lesson:', error);
        showToast('Error loading lesson details', 'error');
    }
}

// Display lesson detail in modal
function displayLessonDetail(lesson) {
    document.getElementById('lessonDetailTitle').textContent = lesson.title;
    
    const content = `
        <div class="row">
            <div class="col-12">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <span class="badge bg-${getDifficultyColor(lesson.difficulty)} me-2">
                            ${getDifficultyText(lesson.difficulty)}
                        </span>
                        ${lesson.isAiGenerated ? '<span class="badge bg-success me-2"><i class="fas fa-magic me-1"></i>AI Generated</span>' : ''}
                        ${lesson.isPublished ? '<span class="badge bg-primary"><i class="fas fa-eye me-1"></i>Published</span>' : '<span class="badge bg-secondary"><i class="fas fa-eye-slash me-1"></i>Draft</span>'}
                    </div>
                    <small class="text-muted">
                        Created: ${formatDate(lesson.createdAt)}
                    </small>
                </div>
                
                <div class="mb-4">
                    <h6>Description</h6>
                    <p class="text-muted">${escapeHtml(lesson.description)}</p>
                </div>
                
                <div class="mb-4">
                    <h6>Content</h6>
                    <div class="lesson-content">
                        ${lesson.content.replace(/\\n/g, '<br>')}
                    </div>
                </div>
                
                ${lesson.codeExamples ? `
                <div class="mb-4">
                    <h6>Code Examples</h6>
                    <pre><code class="language-csharp">${escapeHtml(lesson.codeExamples)}</code></pre>
                </div>
                ` : ''}
                
                ${lesson.quizzes && lesson.quizzes.length > 0 ? `
                <div class="mb-4">
                    <h6>Associated Quizzes</h6>
                    <div class="list-group">
                        ${lesson.quizzes.map(quiz => `
                            <div class="list-group-item">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 class="mb-1">${escapeHtml(quiz.title)}</h6>
                                        <p class="mb-1 text-muted">${escapeHtml(quiz.description)}</p>
                                        <small>Questions: ${quiz.questions ? quiz.questions.length : 0} | Time Limit: ${quiz.timeLimit} minutes</small>
                                    </div>
                                    ${quiz.isAiGenerated ? '<i class="fas fa-magic text-success" title="AI Generated"></i>' : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    document.getElementById('lessonDetailContent').innerHTML = content;
    
    // Update modal buttons
    document.getElementById('editLessonBtn').style.display = 'inline-block';
    document.getElementById('generateQuizBtn').style.display = 'inline-block';
}

// Generate quiz for lesson
async function generateQuizForLesson(lessonId) {
    if (!lessonId && currentLesson) {
        lessonId = currentLesson.id;
    }
    
    try {
        showToast('AI is generating quiz questions... This may take a moment.', 'info');
        
        const response = await makeAuthenticatedRequest(`/api/lesson/${lessonId}/quiz/generate`, 'POST', {
            questionCount: 5,
            timeLimit: 30
        });
        
        if (response.ok) {
            const quiz = await response.json();
            showToast('Quiz generated successfully! Review and publish when ready.', 'success');
            
            // Refresh lesson details to show new quiz
            if (currentLesson && currentLesson.id === lessonId) {
                viewLesson(lessonId);
            }
        } else {
            const error = await response.text();
            showToast(`Error generating quiz: ${error}`, 'error');
        }
    } catch (error) {
        console.error('Error generating quiz:', error);
        showToast('Error generating quiz', 'error');
    }
}

// Edit lesson (placeholder - would open edit modal)
function editLesson(lessonId) {
    showToast('Edit functionality coming soon!', 'info');
}

// Generate quiz (for current lesson in modal)
function generateQuiz() {
    if (currentLesson) {
        generateQuizForLesson(currentLesson.id);
    }
}

// Utility functions
function getDifficultyColor(difficulty) {
    switch (difficulty) {
        case 0: return 'success'; // Beginner
        case 1: return 'warning'; // Intermediate  
        case 2: return 'danger';  // Advanced
        default: return 'secondary';
    }
}

function getDifficultyText(difficulty) {
    switch (difficulty) {
        case 0: return 'Beginner';
        case 1: return 'Intermediate';
        case 2: return 'Advanced';
        default: return 'Unknown';
    }
}

function showSpinner() {
    document.getElementById('loadingSpinner').style.display = 'block';
    document.getElementById('lessonsContainer').style.display = 'none';
}

function hideSpinner() {
    document.getElementById('loadingSpinner').style.display = 'none';
    document.getElementById('lessonsContainer').style.display = 'flex';
}

function showButtonSpinner(buttonText) {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        if (btn.textContent.trim().includes(buttonText)) {
            btn.disabled = true;
            btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span>Processing...`;
        }
    });
}

function hideButtonSpinner(buttonText) {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        if (btn.disabled && btn.textContent.includes('Processing')) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fas fa-${buttonText.includes('Generate') ? 'magic' : 'save'} me-1"></i>${buttonText}`;
        }
    });
}