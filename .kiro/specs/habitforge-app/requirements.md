# Requirements Document

## Introduction

HabitForge is a Progressive Web App (PWA) designed to help users build and maintain positive habits through daily tracking, accountability mechanisms, and AI-powered insights. The system implements a 1% daily improvement philosophy, combining habit tracking with a reward/punishment system to encourage consistency. An AI-powered diary feature provides personalized feedback, habit suggestions, and motivational support while helping users improve their English writing skills.

## Glossary

- **HabitForge_System**: The complete Progressive Web App including all subsystems
- **Habit_Tracker**: The subsystem responsible for managing and tracking user habits
- **Reward_System**: The subsystem that manages and enforces rewards based on habit completion
- **Punishment_System**: The subsystem that manages and enforces punishments for missed habits
- **AI_Diary**: The subsystem that processes diary entries and provides AI-powered feedback
- **Challenge_Manager**: The subsystem that manages challenge tracking and progress
- **Statistics_Dashboard**: The subsystem that displays user progress and analytics
- **User**: A person using the HabitForge application
- **Habit**: A specific behavior or activity that a User tracks daily
- **Streak**: The number of consecutive days a Habit has been completed
- **Completion_Rate**: The percentage of days a Habit was completed over a time period
- **Diary_Entry**: A text record created by the User documenting their day
- **Challenge**: A structured program with specific requirements (e.g., 75 Hard)
- **PWA**: Progressive Web App - a web application that can be installed and used like a native app
- **Voice_to_Text**: Technology that converts spoken words into written text
- **Grammar_Correction**: AI analysis that identifies and suggests fixes for grammatical errors
- **Motivational_Message**: AI-generated encouragement based on User performance and diary content
- **PDF_Export**: A password-protected document containing diary entries
- **Offline_Mode**: Application functionality available without internet connection
- **Backend_Server**: Node.js server handling data persistence and business logic
- **Database**: Persistent storage system for user data, habits, and diary entries
- **Preloaded_Content**: Default habits, rewards, or punishments provided by the system
- **Custom_Content**: User-created habits, rewards, or punishments
- **Achievement_Badge**: A visual indicator of User accomplishments

## Requirements

### Requirement 1: Habit Management

**User Story:** As a User, I want to create and manage custom habits, so that I can track behaviors specific to my goals.

#### Acceptance Criteria

1. THE Habit_Tracker SHALL allow Users to create custom habits with a name and optional description
2. THE Habit_Tracker SHALL provide preloaded common habits including study/focus, fitness/health, coding/projects, and phone/distraction control
3. WHEN a User selects a preloaded habit, THE Habit_Tracker SHALL add it to the User's active habit list
4. THE Habit_Tracker SHALL allow Users to edit habit names and descriptions
5. THE Habit_Tracker SHALL allow Users to delete habits from their active list
6. THE Habit_Tracker SHALL display all active habits in a list view
7. FOR ALL habit operations, THE Habit_Tracker SHALL persist changes to the Database within 2 seconds

### Requirement 2: Daily Habit Tracking

**User Story:** As a User, I want to mark habits as complete each day, so that I can track my progress toward 1% daily improvement.

#### Acceptance Criteria

1. WHEN a User views their habit list, THE Habit_Tracker SHALL display completion status for the current day
2. THE Habit_Tracker SHALL allow Users to mark a habit as complete for the current day
3. THE Habit_Tracker SHALL allow Users to unmark a habit if marked in error
4. WHEN a habit is marked complete, THE Habit_Tracker SHALL update the Streak counter
5. WHEN a habit is not completed by end of day, THE Habit_Tracker SHALL reset the Streak counter to zero
6. THE Habit_Tracker SHALL calculate and display the Completion_Rate for each habit over 7-day, 30-day, and all-time periods
7. WHILE Offline_Mode is active, THE Habit_Tracker SHALL store completion data locally and sync when connection is restored

### Requirement 3: Reward Management

**User Story:** As a User, I want to earn rewards for completing habits, so that I stay motivated to maintain consistency.

#### Acceptance Criteria

1. THE Reward_System SHALL provide preloaded rewards: 20 minutes of reels/YouTube for 1 habit completed, 1 hour of movie/gaming for 3 or more habits completed, and a free day for a 7-day streak
2. THE Reward_System SHALL allow Users to create custom rewards with a name, description, and unlock condition
3. WHEN a User completes the required number of habits, THE Reward_System SHALL unlock the corresponding reward
4. THE Reward_System SHALL display all available rewards with their unlock conditions
5. THE Reward_System SHALL display all unlocked rewards for the current day
6. THE Reward_System SHALL reset daily rewards at midnight local time
7. WHEN a 7-day streak is achieved, THE Reward_System SHALL unlock the free day reward and notify the User

### Requirement 4: Punishment Management

**User Story:** As a User, I want to face consequences for missing habits, so that I maintain accountability and discipline.

#### Acceptance Criteria

1. THE Punishment_System SHALL provide preloaded punishments: delete reels watched, 20 pushups or 15-minute walk, phone away for 2 hours, and no entertainment next day
2. THE Punishment_System SHALL allow Users to create custom punishments with a name, description, and trigger condition
3. WHEN a User fails to complete a habit by end of day, THE Punishment_System SHALL assign the corresponding punishment
4. THE Punishment_System SHALL display all active punishments with their requirements
5. THE Punishment_System SHALL allow Users to mark punishments as completed
6. WHEN a punishment is marked complete, THE Punishment_System SHALL remove it from the active list
7. THE Punishment_System SHALL enforce moderate strictness by allowing Users to acknowledge punishments without forced compliance

### Requirement 5: AI-Powered Diary Entry

**User Story:** As a User, I want to write daily diary entries with AI assistance, so that I can reflect on my day and improve my English writing skills.

#### Acceptance Criteria

1. THE AI_Diary SHALL allow Users to create one diary entry per day
2. THE AI_Diary SHALL support manual text input for diary entries
3. THE AI_Diary SHALL support Voice_to_Text input for diary entries
4. WHEN a User submits a diary entry, THE AI_Diary SHALL analyze the text for grammatical errors
5. WHEN grammatical errors are detected, THE AI_Diary SHALL provide Grammar_Correction suggestions
6. THE AI_Diary SHALL provide vocabulary improvement suggestions for diary entries
7. THE AI_Diary SHALL provide writing tips based on the diary entry content
8. THE AI_Diary SHALL ensure complete privacy by restricting diary entry access to the owning User only
9. FOR ALL diary entries, THE AI_Diary SHALL persist data to the Database within 2 seconds

### Requirement 6: AI Habit Suggestions

**User Story:** As a User, I want AI to analyze my diary entries and suggest new habits, so that I can continuously improve based on my reflections.

#### Acceptance Criteria

1. WHEN a User submits a diary entry, THE AI_Diary SHALL analyze the content for patterns and challenges
2. WHEN relevant patterns are identified, THE AI_Diary SHALL generate habit suggestions for the next day
3. THE AI_Diary SHALL present habit suggestions with explanations of why they are recommended
4. THE AI_Diary SHALL allow Users to accept or dismiss habit suggestions
5. WHEN a User accepts a suggestion, THE Habit_Tracker SHALL add the suggested habit to the User's active list
6. THE AI_Diary SHALL limit habit suggestions to a maximum of 3 per day to avoid overwhelming the User

### Requirement 7: AI Motivational Messages

**User Story:** As a User, I want to receive personalized motivational messages, so that I stay encouraged and focused on my goals.

#### Acceptance Criteria

1. WHEN a User submits a diary entry, THE AI_Diary SHALL generate a Motivational_Message based on the entry content
2. WHEN a User completes habits, THE Statistics_Dashboard SHALL generate a Motivational_Message based on performance
3. THE HabitForge_System SHALL display Motivational_Messages on the dashboard
4. THE HabitForge_System SHALL generate Motivational_Messages that are positive, encouraging, and personalized
5. WHEN a User has a low Completion_Rate, THE HabitForge_System SHALL generate supportive messages that acknowledge challenges
6. WHEN a User has a high Completion_Rate, THE HabitForge_System SHALL generate celebratory messages that reinforce success

### Requirement 8: Diary Export

**User Story:** As a User, I want to export my diary entries to a password-protected PDF, so that I can keep a permanent record of my reflections.

#### Acceptance Criteria

1. THE AI_Diary SHALL provide a PDF_Export function accessible from the diary interface
2. WHEN a User initiates PDF_Export, THE AI_Diary SHALL prompt for a password
3. THE AI_Diary SHALL generate a PDF document containing all diary entries in chronological order
4. THE AI_Diary SHALL protect the PDF document with the User-provided password
5. WHEN new diary entries are created after an export, THE AI_Diary SHALL append new entries to the end of the PDF on subsequent exports
6. THE AI_Diary SHALL format the PDF with readable typography, proper spacing, and date headers for each entry
7. THE AI_Diary SHALL complete PDF generation and download within 10 seconds for up to 365 diary entries

### Requirement 9: Challenge Management

**User Story:** As a User, I want to participate in structured challenges like 75 Hard, so that I can follow proven programs for habit building.

#### Acceptance Criteria

1. THE Challenge_Manager SHALL provide preloaded popular challenges including 75 Hard
2. THE Challenge_Manager SHALL allow Users to import challenges from external sources
3. WHEN a User selects a challenge, THE Challenge_Manager SHALL display the challenge requirements and rules
4. THE Challenge_Manager SHALL allow Users to start a challenge
5. WHEN a challenge is active, THE Challenge_Manager SHALL track progress against challenge requirements
6. THE Challenge_Manager SHALL display challenge progress with visual indicators
7. WHEN challenge requirements are not met, THE Challenge_Manager SHALL apply challenge-specific consequences
8. WHEN a challenge is completed, THE Challenge_Manager SHALL award an Achievement_Badge

### Requirement 10: Statistics Dashboard

**User Story:** As a User, I want to view visual statistics of my habit performance, so that I can understand my progress and identify areas for improvement.

#### Acceptance Criteria

1. THE Statistics_Dashboard SHALL display current Streak for each active habit
2. THE Statistics_Dashboard SHALL display Completion_Rate for each habit over 7-day, 30-day, and all-time periods
3. THE Statistics_Dashboard SHALL display a line chart showing completion trends over time
4. THE Statistics_Dashboard SHALL display a calendar heatmap showing daily habit completion
5. THE Statistics_Dashboard SHALL display total habits completed in the current week and month
6. THE Statistics_Dashboard SHALL display all earned Achievement_Badges
7. THE Statistics_Dashboard SHALL update all statistics in real-time when habits are marked complete
8. THE Statistics_Dashboard SHALL use color coding to indicate performance levels (green for high completion, yellow for moderate, red for low)

### Requirement 11: Achievement System

**User Story:** As a User, I want to earn achievement badges for milestones, so that I feel recognized for my progress.

#### Acceptance Criteria

1. THE HabitForge_System SHALL award Achievement_Badges for milestones including 7-day streak, 30-day streak, 100-day streak, and challenge completion
2. WHEN a milestone is reached, THE HabitForge_System SHALL display a notification with the Achievement_Badge
3. THE Statistics_Dashboard SHALL display all earned Achievement_Badges in a dedicated section
4. THE HabitForge_System SHALL display Achievement_Badges with visual icons and descriptions
5. THE HabitForge_System SHALL track progress toward unearned Achievement_Badges
6. THE Statistics_Dashboard SHALL display progress bars for Achievement_Badges that are in progress

### Requirement 12: Progressive Web App Installation

**User Story:** As a User, I want to install HabitForge on my Android device, so that I can access it like a native app.

#### Acceptance Criteria

1. THE HabitForge_System SHALL implement PWA standards including service worker and web app manifest
2. WHEN a User visits HabitForge in a compatible browser, THE HabitForge_System SHALL display an installation prompt
3. THE HabitForge_System SHALL allow installation on Android devices via browser
4. WHEN installed, THE HabitForge_System SHALL display an app icon on the device home screen
5. WHEN launched from the home screen, THE HabitForge_System SHALL open in standalone mode without browser UI
6. THE HabitForge_System SHALL cache essential resources for offline access
7. THE HabitForge_System SHALL display a splash screen during app launch

### Requirement 13: Offline Capability

**User Story:** As a User, I want to use HabitForge without an internet connection, so that I can track habits anywhere.

#### Acceptance Criteria

1. WHILE Offline_Mode is active, THE HabitForge_System SHALL allow Users to mark habits as complete
2. WHILE Offline_Mode is active, THE HabitForge_System SHALL allow Users to create diary entries
3. WHILE Offline_Mode is active, THE HabitForge_System SHALL display cached statistics and habit data
4. WHEN internet connection is restored, THE HabitForge_System SHALL sync all offline changes to the Backend_Server
5. WHEN sync conflicts occur, THE HabitForge_System SHALL prioritize the most recent change
6. THE HabitForge_System SHALL display a visual indicator when operating in Offline_Mode
7. WHILE Offline_Mode is active, THE HabitForge_System SHALL disable features requiring internet connectivity including AI analysis and PDF export

### Requirement 14: Backend Server

**User Story:** As a system administrator, I want a Node.js backend server, so that the application can handle data persistence and business logic.

#### Acceptance Criteria

1. THE Backend_Server SHALL be implemented using Node.js
2. THE Backend_Server SHALL provide RESTful API endpoints for all client operations
3. THE Backend_Server SHALL authenticate Users before processing requests
4. THE Backend_Server SHALL validate all incoming data before processing
5. THE Backend_Server SHALL handle concurrent requests from multiple Users
6. THE Backend_Server SHALL log errors with sufficient detail for debugging
7. THE Backend_Server SHALL be deployable on free hosting platforms including Render, Railway, and Vercel

### Requirement 15: Data Persistence

**User Story:** As a User, I want my data to be saved reliably, so that I never lose my habit tracking history or diary entries.

#### Acceptance Criteria

1. THE Database SHALL store all User data including habits, diary entries, rewards, punishments, and statistics
2. THE Database SHALL ensure data integrity through transaction support
3. WHEN data is modified, THE Database SHALL persist changes within 2 seconds
4. THE Database SHALL support efficient queries for statistics and analytics
5. THE Database SHALL implement backup mechanisms to prevent data loss
6. THE Database SHALL be compatible with free hosting platform database options
7. THE Database SHALL encrypt sensitive data including diary entries and User credentials

### Requirement 16: Responsive Mobile-First Design

**User Story:** As a User, I want HabitForge to work seamlessly on my mobile device, so that I can track habits on the go.

#### Acceptance Criteria

1. THE HabitForge_System SHALL implement a mobile-first responsive design
2. THE HabitForge_System SHALL display correctly on screen sizes from 320px to 1920px width
3. THE HabitForge_System SHALL use touch-friendly interface elements with minimum 44px tap targets
4. THE HabitForge_System SHALL optimize layouts for portrait and landscape orientations
5. THE HabitForge_System SHALL load the initial view within 3 seconds on 3G mobile connections
6. THE HabitForge_System SHALL use readable font sizes with minimum 16px for body text
7. THE HabitForge_System SHALL provide smooth scrolling and transitions on mobile devices

### Requirement 17: User Authentication

**User Story:** As a User, I want to create an account and log in securely, so that my data is private and protected.

#### Acceptance Criteria

1. THE HabitForge_System SHALL allow Users to create accounts with email and password
2. THE HabitForge_System SHALL enforce password requirements including minimum 8 characters, one uppercase letter, one lowercase letter, and one number
3. WHEN a User creates an account, THE Backend_Server SHALL hash the password before storage
4. THE HabitForge_System SHALL allow Users to log in with email and password
5. WHEN login credentials are invalid, THE HabitForge_System SHALL display an error message without revealing which credential is incorrect
6. THE HabitForge_System SHALL maintain User sessions for 30 days unless explicitly logged out
7. THE HabitForge_System SHALL allow Users to reset passwords via email verification

### Requirement 18: AI Grammar Correction Parser

**User Story:** As a developer, I want to parse AI grammar correction responses, so that I can display suggestions to Users.

#### Acceptance Criteria

1. WHEN the AI service returns grammar corrections, THE AI_Diary SHALL parse the response into structured correction objects
2. WHEN the AI service returns an invalid response, THE AI_Diary SHALL log the error and display a user-friendly message
3. THE AI_Diary SHALL format correction objects with original text, corrected text, and explanation
4. FOR ALL valid correction objects, parsing then formatting then parsing SHALL produce an equivalent object (round-trip property)

### Requirement 19: Diary Entry Parser

**User Story:** As a developer, I want to parse diary entries for export, so that I can generate properly formatted PDF documents.

#### Acceptance Criteria

1. WHEN generating a PDF_Export, THE AI_Diary SHALL parse diary entries into structured document objects
2. WHEN a diary entry contains special characters, THE AI_Diary SHALL escape them properly for PDF generation
3. THE AI_Diary SHALL format document objects with date, content, and metadata
4. FOR ALL valid document objects, parsing then formatting then parsing SHALL produce an equivalent object (round-trip property)

### Requirement 20: Challenge Configuration Parser

**User Story:** As a developer, I want to parse imported challenge configurations, so that Users can add challenges from external sources.

#### Acceptance Criteria

1. WHEN a User imports a challenge, THE Challenge_Manager SHALL parse the configuration into a structured challenge object
2. WHEN the configuration is invalid, THE Challenge_Manager SHALL return a descriptive error message
3. THE Challenge_Manager SHALL validate that challenge objects contain required fields including name, description, requirements, and duration
4. FOR ALL valid challenge objects, parsing then formatting then parsing SHALL produce an equivalent object (round-trip property)

---

## Notes

This requirements document defines the complete HabitForge system using EARS patterns and INCOSE quality rules. All requirements are testable, solution-free, and written in active voice with specific system names from the Glossary.

Key architectural considerations for the design phase:
- AI integration will require API selection (OpenAI, Anthropic, or similar)
- Database selection should prioritize free tier availability and Node.js compatibility
- PWA implementation requires service worker strategy for offline functionality
- Mobile-first design should use modern CSS frameworks or component libraries
- Authentication should use industry-standard libraries (JWT, bcrypt)

The requirements include three parser requirements (R18, R19, R20) with explicit round-trip properties, as parsers are critical components that benefit from property-based testing.
