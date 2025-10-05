// Quiz Creator Module for Teacher Dashboard
class QuizCreator {
    constructor() {
        this.currentQuiz = {
            id: null,
            title: '',
            description: '',
            lessonId: '',
            timeLimit: 30,
            questions: [],
            assignedClasses: [],
            dueDate: null,
            isPublished: false
        };
        this.questionCounter = 0;
        this.init();
    }

    init() {
        // Initialize event listeners
        document.addEventListener('DOMContentLoaded', () => {
            this.setupEventListeners();
            this.loadLessonsForQuiz();
            this.loadClassesForAssignment();
        });
    }

    setupEventListeners() {
        // Quiz creation form submission
        const quizForm = document.getElementById('quizCreationForm');
        if (quizForm) {
            quizForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveQuiz();
            });
        }

        // Modal events
        const quizModal = document.getElementById('quizCreationModal');
        if (quizModal) {
            quizModal.addEventListener('show.bs.modal', () => {
                this.resetQuizForm();
            });
        }
    }

    resetQuizForm() {
        this.currentQuiz = {
            id: null,
            title: '',
            description: '',
            lessonId: '',
            timeLimit: 30,
            questions: [],
            assignedClasses: [],
            dueDate: null,
            isPublished: false
        };
        this.questionCounter = 0;

        // Reset form fields
        document.getElementById('quizTitleInput').value = '';
        document.getElementById('quizDescriptionInput').value = '';
        document.getElementById('quizLessonSelectInput').value = '';
        document.getElementById('quizTimeLimitInput').value = '30';
        document.getElementById('aiQuestionCount').value = '5';
        document.getElementById('quizDueDate').value = '';
        document.getElementById('publishImmediately').checked = true;

        // Clear questions container
        this.renderQuestionsContainer();
    }

    async loadLessonsForQuiz() {
        try {
            const response = await makeAuthenticatedRequest('/api/teacher/lessons', 'GET');
            if (response.ok) {
                const lessons = await response.json();
                const select = document.getElementById('quizLessonSelectInput');
                if (select) {
                    select.innerHTML = '<option value="">Select a lesson...</option>';
                    lessons.forEach(lesson => {
                        const option = document.createElement('option');
                        option.value = lesson.id;
                        option.textContent = lesson.title;
                        select.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('Error loading lessons:', error);
        }
    }

    async loadClassesForAssignment() {
        try {
            const response = await makeAuthenticatedRequest('/api/teacher/classes', 'GET');
            if (response.ok) {
                const classes = await response.json();
                const select = document.getElementById('assignToClasses');
                if (select) {
                    select.innerHTML = '';
                    classes.forEach(cls => {
                        const option = document.createElement('option');
                        option.value = cls.id;
                        option.textContent = cls.name;
                        select.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('Error loading classes:', error);
        }
    }

    addQuestion(type) {
        this.questionCounter++;
        const question = {
            id: `q_${this.questionCounter}`,
            type: type,
            questionText: '',
            codeSnippet: '',
            points: 1,
            options: type === 'MultipleChoice' ? [
                { text: '', isCorrect: false },
                { text: '', isCorrect: false },
                { text: '', isCorrect: false },
                { text: '', isCorrect: false }
            ] : type === 'TrueFalse' ? [
                { text: 'True', isCorrect: false },
                { text: 'False', isCorrect: false }
            ] : [],
            correctAnswer: '',
            orderIndex: this.currentQuiz.questions.length
        };

        this.currentQuiz.questions.push(question);
        this.renderQuestionsContainer();
    }

    removeQuestion(questionId) {
        this.currentQuiz.questions = this.currentQuiz.questions.filter(q => q.id !== questionId);
        this.renderQuestionsContainer();
    }

    moveQuestion(questionId, direction) {
        const index = this.currentQuiz.questions.findIndex(q => q.id === questionId);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= this.currentQuiz.questions.length) return;

        // Swap questions
        [this.currentQuiz.questions[index], this.currentQuiz.questions[newIndex]] = 
        [this.currentQuiz.questions[newIndex], this.currentQuiz.questions[index]];

        // Update order indices
        this.currentQuiz.questions.forEach((q, i) => q.orderIndex = i);
        this.renderQuestionsContainer();
    }

    renderQuestionsContainer() {
        const container = document.getElementById('quizQuestionsContainer');
        if (!container) return;

        if (this.currentQuiz.questions.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-question-circle fa-3x mb-3"></i>
                    <p>No questions added yet. Click the buttons above to add questions.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.currentQuiz.questions.map((question, index) => 
            this.renderQuestionCard(question, index)
        ).join('');

        // Attach event listeners to question inputs
        this.attachQuestionEventListeners();
    }

    renderQuestionCard(question, index) {
        const typeIcon = {
            'MultipleChoice': 'fas fa-list-ul',
            'TrueFalse': 'fas fa-check-circle',
            'CodeCompletion': 'fas fa-code',
            'ShortAnswer': 'fas fa-edit'
        };

        const typeColor = {
            'MultipleChoice': 'primary',
            'TrueFalse': 'success',
            'CodeCompletion': 'info',
            'ShortAnswer': 'warning'
        };

        return `
            <div class="card mb-3 question-card" data-question-id="${question.id}">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        <span class="badge bg-${typeColor[question.type]} me-2">
                            <i class="${typeIcon[question.type]} me-1"></i>${question.type.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span class="text-muted">Question ${index + 1}</span>
                    </div>
                    <div class="btn-group btn-group-sm">
                        <button type="button" class="btn btn-outline-secondary" onclick="quizCreator.moveQuestion('${question.id}', 'up')" ${index === 0 ? 'disabled' : ''}>
                            <i class="fas fa-arrow-up"></i>
                        </button>
                        <button type="button" class="btn btn-outline-secondary" onclick="quizCreator.moveQuestion('${question.id}', 'down')" ${index === this.currentQuiz.questions.length - 1 ? 'disabled' : ''}>
                            <i class="fas fa-arrow-down"></i>
                        </button>
                        <button type="button" class="btn btn-outline-danger" onclick="quizCreator.removeQuestion('${question.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <div class="mb-3">
                                <label class="form-label">Question Text</label>
                                <textarea class="form-control question-text" data-question-id="${question.id}" rows="2" placeholder="Enter your question here...">${question.questionText}</textarea>
                            </div>
                            ${question.type === 'CodeCompletion' ? `
                                <div class="mb-3">
                                    <label class="form-label">Code Snippet</label>
                                    <textarea class="form-control code-snippet" data-question-id="${question.id}" rows="4" placeholder="// Enter code snippet here...">${question.codeSnippet}</textarea>
                                </div>
                            ` : ''}
                        </div>
                        <div class="col-md-4">
                            <div class="mb-3">
                                <label class="form-label">Points</label>
                                <input type="number" class="form-control question-points" data-question-id="${question.id}" value="${question.points}" min="1" max="10">
                            </div>
                        </div>
                    </div>
                    ${this.renderQuestionOptions(question)}
                </div>
            </div>
        `;
    }

    renderQuestionOptions(question) {
        switch (question.type) {
            case 'MultipleChoice':
                return `
                    <div class="mb-3">
                        <label class="form-label">Answer Options</label>
                        ${question.options.map((option, index) => `
                            <div class="input-group mb-2">
                                <div class="input-group-text">
                                    <input class="form-check-input mt-0 option-correct" type="radio" name="correct_${question.id}" data-question-id="${question.id}" data-option-index="${index}" ${option.isCorrect ? 'checked' : ''}>
                                </div>
                                <span class="input-group-text">${String.fromCharCode(65 + index)}</span>
                                <input type="text" class="form-control option-text" data-question-id="${question.id}" data-option-index="${index}" value="${option.text}" placeholder="Enter option text...">
                            </div>
                        `).join('')}
                        <small class="text-muted">Select the radio button next to the correct answer</small>
                    </div>
                `;
            case 'TrueFalse':
                return `
                    <div class="mb-3">
                        <label class="form-label">Correct Answer</label>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="tf_${question.id}" data-question-id="${question.id}" data-option-index="0" ${question.options[0]?.isCorrect ? 'checked' : ''}>
                            <label class="form-check-label">True</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="tf_${question.id}" data-question-id="${question.id}" data-option-index="1" ${question.options[1]?.isCorrect ? 'checked' : ''}>
                            <label class="form-check-label">False</label>
                        </div>
                    </div>
                `;
            case 'ShortAnswer':
                return `
                    <div class="mb-3">
                        <label class="form-label">Expected Answer (for grading reference)</label>
                        <input type="text" class="form-control short-answer" data-question-id="${question.id}" value="${question.correctAnswer}" placeholder="Enter expected answer...">
                        <small class="text-muted">This will help with manual grading</small>
                    </div>
                `;
            case 'CodeCompletion':
                return `
                    <div class="mb-3">
                        <label class="form-label">Expected Code Solution</label>
                        <textarea class="form-control code-answer" data-question-id="${question.id}" rows="3" placeholder="// Enter expected code solution...">${question.correctAnswer}</textarea>
                        <small class="text-muted">This will help with manual grading</small>
                    </div>
                `;
            default:
                return '';
        }
    }

    attachQuestionEventListeners() {
        // Question text inputs
        document.querySelectorAll('.question-text').forEach(input => {
            input.addEventListener('input', (e) => {
                const questionId = e.target.dataset.questionId;
                const question = this.currentQuiz.questions.find(q => q.id === questionId);
                if (question) question.questionText = e.target.value;
            });
        });

        // Code snippet inputs
        document.querySelectorAll('.code-snippet').forEach(input => {
            input.addEventListener('input', (e) => {
                const questionId = e.target.dataset.questionId;
                const question = this.currentQuiz.questions.find(q => q.id === questionId);
                if (question) question.codeSnippet = e.target.value;
            });
        });

        // Points inputs
        document.querySelectorAll('.question-points').forEach(input => {
            input.addEventListener('input', (e) => {
                const questionId = e.target.dataset.questionId;
                const question = this.currentQuiz.questions.find(q => q.id === questionId);
                if (question) question.points = parseInt(e.target.value) || 1;
            });
        });

        // Option text inputs
        document.querySelectorAll('.option-text').forEach(input => {
            input.addEventListener('input', (e) => {
                const questionId = e.target.dataset.questionId;
                const optionIndex = parseInt(e.target.dataset.optionIndex);
                const question = this.currentQuiz.questions.find(q => q.id === questionId);
                if (question && question.options[optionIndex]) {
                    question.options[optionIndex].text = e.target.value;
                }
            });
        });

        // Correct answer radio buttons
        document.querySelectorAll('.option-correct').forEach(input => {
            input.addEventListener('change', (e) => {
                const questionId = e.target.dataset.questionId;
                const optionIndex = parseInt(e.target.dataset.optionIndex);
                const question = this.currentQuiz.questions.find(q => q.id === questionId);
                if (question) {
                    question.options.forEach((opt, idx) => {
                        opt.isCorrect = idx === optionIndex;
                    });
                }
            });
        });

        // True/False radio buttons
        document.querySelectorAll('input[type="radio"][name^="tf_"]').forEach(input => {
            input.addEventListener('change', (e) => {
                const questionId = e.target.dataset.questionId;
                const optionIndex = parseInt(e.target.dataset.optionIndex);
                const question = this.currentQuiz.questions.find(q => q.id === questionId);
                if (question) {
                    question.options.forEach((opt, idx) => {
                        opt.isCorrect = idx === optionIndex;
                    });
                }
            });
        });

        // Short answer inputs
        document.querySelectorAll('.short-answer').forEach(input => {
            input.addEventListener('input', (e) => {
                const questionId = e.target.dataset.questionId;
                const question = this.currentQuiz.questions.find(q => q.id === questionId);
                if (question) question.correctAnswer = e.target.value;
            });
        });

        // Code answer inputs
        document.querySelectorAll('.code-answer').forEach(input => {
            input.addEventListener('input', (e) => {
                const questionId = e.target.dataset.questionId;
                const question = this.currentQuiz.questions.find(q => q.id === questionId);
                if (question) question.correctAnswer = e.target.value;
            });
        });
    }

    async generateAIQuestions() {
        const lessonId = document.getElementById('quizLessonSelectInput').value;
        const questionCount = parseInt(document.getElementById('aiQuestionCount').value) || 5;

        if (!lessonId) {
            showToast('Please select a lesson first', 'warning');
            return;
        }

        try {
            showToast('AI is generating quiz questions... This may take a moment.', 'info');
            
            const response = await makeAuthenticatedRequest(`/api/lesson/${lessonId}/quiz/generate`, 'POST', {
                questionCount: questionCount,
                timeLimit: 30
            });

            if (response.ok) {
                const generatedQuiz = await response.json();
                
                // Add generated questions to current quiz
                if (generatedQuiz.questions && generatedQuiz.questions.length > 0) {
                    generatedQuiz.questions.forEach(q => {
                        this.questionCounter++;
                        const question = {
                            id: `q_${this.questionCounter}`,
                            type: 'MultipleChoice',
                            questionText: q.questionText,
                            codeSnippet: q.codeSnippet || '',
                            points: q.points || 1,
                            options: q.options || [],
                            correctAnswer: '',
                            orderIndex: this.currentQuiz.questions.length
                        };
                        this.currentQuiz.questions.push(question);
                    });
                    
                    this.renderQuestionsContainer();
                    showToast(`${generatedQuiz.questions.length} AI-generated questions added successfully!`, 'success');
                } else {
                    showToast('No questions were generated. Please try again.', 'warning');
                }
            } else {
                const error = await response.text();
                showToast(`Error generating questions: ${error}`, 'error');
            }
        } catch (error) {
            console.error('Error generating AI questions:', error);
            showToast('Error generating questions. Please try again.', 'error');
        }
    }

    previewQuiz() {
        if (!this.validateQuiz()) return;

        this.updateQuizFromForm();
        const previewContent = this.generateQuizPreview();
        
        document.getElementById('quizPreviewContent').innerHTML = previewContent;
        
        // Show preview modal
        const previewModal = new bootstrap.Modal(document.getElementById('quizPreviewModal'));
        previewModal.show();
    }

    generateQuizPreview() {
        const quiz = this.currentQuiz;
        return `
            <div class="quiz-preview">
                <div class="mb-4">
                    <h4>${quiz.title}</h4>
                    ${quiz.description ? `<p class="text-muted">${quiz.description}</p>` : ''}
                    <div class="row">
                        <div class="col-md-6">
                            <small class="text-muted">Time Limit: ${quiz.timeLimit} minutes</small>
                        </div>
                        <div class="col-md-6">
                            <small class="text-muted">Total Questions: ${quiz.questions.length}</small>
                        </div>
                    </div>
                </div>
                
                ${quiz.questions.map((question, index) => `
                    <div class="card mb-3">
                        <div class="card-body">
                            <h6>Question ${index + 1} (${question.points} point${question.points !== 1 ? 's' : ''})</h6>
                            <p>${question.questionText}</p>
                            
                            ${question.codeSnippet ? `
                                <pre class="bg-light p-2 rounded"><code>${question.codeSnippet}</code></pre>
                            ` : ''}
                            
                            ${question.type === 'MultipleChoice' ? `
                                <div class="ms-3">
                                    ${question.options.map((option, optIndex) => `
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" disabled ${option.isCorrect ? 'checked' : ''}>
                                            <label class="form-check-label ${option.isCorrect ? 'text-success fw-bold' : ''}">
                                                ${String.fromCharCode(65 + optIndex)}. ${option.text}
                                            </label>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : question.type === 'TrueFalse' ? `
                                <div class="ms-3">
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" disabled ${question.options[0]?.isCorrect ? 'checked' : ''}>
                                        <label class="form-check-label ${question.options[0]?.isCorrect ? 'text-success fw-bold' : ''}">True</label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" disabled ${question.options[1]?.isCorrect ? 'checked' : ''}>
                                        <label class="form-check-label ${question.options[1]?.isCorrect ? 'text-success fw-bold' : ''}">False</label>
                                    </div>
                                </div>
                            ` : `
                                <div class="ms-3">
                                    <small class="text-muted">Expected answer: ${question.correctAnswer}</small>
                                </div>
                            `}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    editQuiz() {
        // Close preview modal and return to edit mode
        const previewModal = bootstrap.Modal.getInstance(document.getElementById('quizPreviewModal'));
        if (previewModal) previewModal.hide();
    }

    validateQuiz() {
        const title = document.getElementById('quizTitleInput').value.trim();
        const lessonId = document.getElementById('quizLessonSelectInput').value;

        if (!title) {
            showToast('Please enter a quiz title', 'warning');
            return false;
        }

        if (!lessonId) {
            showToast('Please select a lesson for this quiz', 'warning');
            return false;
        }

        if (this.currentQuiz.questions.length === 0) {
            showToast('Please add at least one question to the quiz', 'warning');
            return false;
        }

        // Validate each question
        for (let i = 0; i < this.currentQuiz.questions.length; i++) {
            const question = this.currentQuiz.questions[i];
            
            if (!question.questionText.trim()) {
                showToast(`Please enter text for question ${i + 1}`, 'warning');
                return false;
            }

            if (question.type === 'MultipleChoice') {
                const hasCorrectAnswer = question.options.some(opt => opt.isCorrect);
                const hasAllOptions = question.options.every(opt => opt.text.trim());
                
                if (!hasCorrectAnswer) {
                    showToast(`Please select the correct answer for question ${i + 1}`, 'warning');
                    return false;
                }
                
                if (!hasAllOptions) {
                    showToast(`Please fill in all options for question ${i + 1}`, 'warning');
                    return false;
                }
            } else if (question.type === 'TrueFalse') {
                const hasCorrectAnswer = question.options.some(opt => opt.isCorrect);
                if (!hasCorrectAnswer) {
                    showToast(`Please select the correct answer for question ${i + 1}`, 'warning');
                    return false;
                }
            }
        }

        return true;
    }

    updateQuizFromForm() {
        this.currentQuiz.title = document.getElementById('quizTitleInput').value.trim();
        this.currentQuiz.description = document.getElementById('quizDescriptionInput').value.trim();
        this.currentQuiz.lessonId = document.getElementById('quizLessonSelectInput').value;
        this.currentQuiz.timeLimit = parseInt(document.getElementById('quizTimeLimitInput').value) || 30;
        this.currentQuiz.isPublished = document.getElementById('publishImmediately').checked;
        
        // Get selected classes
        const classSelect = document.getElementById('assignToClasses');
        this.currentQuiz.assignedClasses = Array.from(classSelect.selectedOptions).map(opt => opt.value);
        
        // Get due date
        const dueDate = document.getElementById('quizDueDate').value;
        this.currentQuiz.dueDate = dueDate ? new Date(dueDate).toISOString() : null;
    }

    mapQuestionType(type) {
        const typeMap = {
            'MultipleChoice': 1,
            'TrueFalse': 2,
            'CodeCompletion': 3,
            'ShortAnswer': 4
        };
        return typeMap[type] || 1;
    }

    async saveQuiz() {
        if (!this.validateQuiz()) return;

        this.updateQuizFromForm();

        try {
            showToast('Saving quiz...', 'info');

            // First create the quiz structure
            const quizResponse = await makeAuthenticatedRequest(`/api/teacher/lessons/${this.currentQuiz.lessonId}/quiz`, 'POST', {
                title: this.currentQuiz.title,
                description: this.currentQuiz.description,
                timeLimit: this.currentQuiz.timeLimit
            });

            if (!quizResponse.ok) {
                const error = await quizResponse.text();
                showToast(`Error creating quiz: ${error}`, 'error');
                return;
            }

            const savedQuiz = await quizResponse.json();

            // Then add questions to the quiz
            for (const question of this.currentQuiz.questions) {
                const questionResponse = await makeAuthenticatedRequest(`/api/teacher/quiz/${savedQuiz.id}/questions`, 'POST', {
                    questionText: question.questionText,
                    type: question.type,
                    options: question.options.map(opt => ({ text: opt.text, isCorrect: opt.isCorrect }))
                });

                if (!questionResponse.ok) {
                    console.warn(`Failed to add question: ${question.questionText}`);
                }
            }

            // Assign quiz to classes if any are selected
            if (this.currentQuiz.assignedClasses.length > 0) {
                const assignmentData = {
                    classIds: this.currentQuiz.assignedClasses,
                    dueDate: this.currentQuiz.dueDate
                };

                const assignResponse = await makeAuthenticatedRequest(`/api/teacher/quiz/${savedQuiz.id}/assign`, 'POST', assignmentData);
                if (!assignResponse.ok) {
                    console.warn('Failed to assign quiz to classes');
                }
            }

            showToast('Quiz saved successfully!', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('quizCreationModal'));
            if (modal) modal.hide();
            
            // Refresh teacher dashboard if available
            if (typeof teacherDashboard !== 'undefined' && teacherDashboard.loadDashboardData) {
                teacherDashboard.loadDashboardData();
            }
        } catch (error) {
            console.error('Error saving quiz:', error);
            showToast('Error saving quiz. Please try again.', 'error');
        }
    }
}

// Initialize quiz creator
const quizCreator = new QuizCreator();