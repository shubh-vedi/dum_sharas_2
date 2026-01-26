#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Build a Dumb Charades Hindi Movie Guessing game app with team setup, turn-based gameplay, movie hints, difficulty levels, scoring system, and timer functionality"

backend:
  - task: "Hindi Movies Database with 112 movies seeded"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
        - agent: "main"
        - comment: "Movies database seeded with 112 Bollywood movies from 1975-2025 with hero, heroine, year, difficulty metadata"

  - task: "GET /api/stats - Get game statistics"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
        - agent: "main"
        - comment: "Returns total movies, easy/medium/hard counts, and total games played"
        - working: true
        - agent: "testing"
        - comment: "✅ TESTED: Returns correct stats - 112 total movies (35 easy, 37 medium, 40 hard), 0 total games. All required fields present and counts match."

  - task: "GET /api/movies/random - Get random movie by difficulty"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: NA
        - agent: "main"
        - comment: "Returns random movie with optional difficulty filter and exclude IDs"
        - working: true
        - agent: "testing"
        - comment: "✅ TESTED: All functionality working - basic random movie, difficulty filters (easy/medium/hard), exclude_ids parameter. Returns proper movie objects with all required fields (id, title, year, hero, heroine, word_count, difficulty)."

  - task: "POST /api/games - Create new game"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: NA
        - agent: "main"
        - comment: "Creates new game with team setup, settings (timer, rounds, difficulty)"
        - working: true
        - agent: "testing"
        - comment: "✅ TESTED: Game creation working perfectly. Creates teams with correct players, applies settings (timer: 60s, rounds: 5, difficulty: all), sets initial state (team_a turn, round 1, active status). Returns complete game object with UUID."

  - task: "POST /api/games/{id}/turn - Submit turn result"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: NA
        - agent: "main"
        - comment: "Handles correct/skip, updates scores, switches turns, ends game"
        - working: true
        - agent: "testing"
        - comment: "✅ TESTED: Turn submission working perfectly. Correctly updates scores for correct answers, switches turns between teams, increments rounds, handles skips (no score change). Game logic functioning as expected."

frontend:
  - task: "Home Screen with Bollywood theme"
    implemented: true
    working: true
    file: "/app/frontend/app/index.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
        - agent: "main"
        - comment: "Shows movie count, play now button, how to play, feature icons"

  - task: "Team Setup Screen"
    implemented: true
    working: true
    file: "/app/frontend/app/team-setup.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: true
        - agent: "main"
        - comment: "Team A/B player inputs, game settings (timer, rounds, difficulty)"

  - task: "Rules Screen"
    implemented: true
    working: true
    file: "/app/frontend/app/rules.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: true
        - agent: "main"
        - comment: "Shows all game rules and acting tips"

  - task: "Game Play Screen with timer and hints"
    implemented: true
    working: NA
    file: "/app/frontend/app/game-play.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: NA
        - agent: "main"
        - comment: "Timer, movie hints, correct/skip buttons, scoreboard"

  - task: "Results Screen"
    implemented: true
    working: NA
    file: "/app/frontend/app/results.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: NA
        - agent: "main"
        - comment: "Shows winner, final scores, play again option"

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "GET /api/stats"
    - "GET /api/movies/random"
    - "POST /api/games"
    - "POST /api/games/{id}/turn"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
    - message: "Backend APIs implemented: stats, movies, games CRUD. Frontend screens: home, team-setup, rules, game-play, results. Need testing of full game flow."