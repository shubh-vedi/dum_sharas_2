#!/usr/bin/env python3
"""
Backend API Testing for Dumb Charades Hindi Movie Game
Tests all backend endpoints with comprehensive scenarios
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Use the production URL from frontend/.env
BASE_URL = "https://clone-builder-48.preview.emergentagent.com/api"

class APITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_results = []
        self.created_game_id = None
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        
    def make_request(self, method: str, endpoint: str, **kwargs) -> tuple[bool, Any]:
        """Make HTTP request and handle errors"""
        url = f"{self.base_url}{endpoint}"
        try:
            response = self.session.request(method, url, timeout=30, **kwargs)
            return True, response
        except requests.exceptions.RequestException as e:
            return False, str(e)
    
    def test_stats_endpoint(self):
        """Test GET /api/stats"""
        print("\n=== Testing GET /api/stats ===")
        
        success, response = self.make_request("GET", "/stats")
        if not success:
            self.log_test("GET /api/stats - Connection", False, f"Connection failed: {response}")
            return
            
        if response.status_code != 200:
            self.log_test("GET /api/stats - Status Code", False, f"Expected 200, got {response.status_code}")
            return
            
        try:
            data = response.json()
            required_fields = ["total_movies", "easy_movies", "medium_movies", "hard_movies", "total_games"]
            
            for field in required_fields:
                if field not in data:
                    self.log_test(f"GET /api/stats - Field {field}", False, f"Missing field: {field}")
                    return
                    
            # Check if total_movies is 112 as expected
            if data["total_movies"] != 112:
                self.log_test("GET /api/stats - Movie Count", False, f"Expected 112 movies, got {data['total_movies']}")
            else:
                self.log_test("GET /api/stats - Movie Count", True, f"Found {data['total_movies']} movies")
                
            # Verify difficulty counts add up
            difficulty_sum = data["easy_movies"] + data["medium_movies"] + data["hard_movies"]
            if difficulty_sum != data["total_movies"]:
                self.log_test("GET /api/stats - Difficulty Sum", False, f"Difficulty counts don't add up: {difficulty_sum} != {data['total_movies']}")
            else:
                self.log_test("GET /api/stats - Difficulty Sum", True, "Difficulty counts match total")
                
            self.log_test("GET /api/stats - Response Format", True, f"All required fields present: {data}")
            
        except json.JSONDecodeError:
            self.log_test("GET /api/stats - JSON Parse", False, "Invalid JSON response")
    
    def test_random_movie_endpoint(self):
        """Test GET /api/movies/random with various parameters"""
        print("\n=== Testing GET /api/movies/random ===")
        
        # Test basic random movie
        success, response = self.make_request("GET", "/movies/random")
        if not success:
            self.log_test("GET /api/movies/random - Connection", False, f"Connection failed: {response}")
            return
            
        if response.status_code != 200:
            self.log_test("GET /api/movies/random - Status Code", False, f"Expected 200, got {response.status_code}")
            return
            
        try:
            movie = response.json()
            required_fields = ["id", "title", "year", "hero", "heroine", "word_count", "difficulty"]
            
            for field in required_fields:
                if field not in movie:
                    self.log_test(f"GET /api/movies/random - Field {field}", False, f"Missing field: {field}")
                    return
                    
            self.log_test("GET /api/movies/random - Basic", True, f"Got movie: {movie['title']} ({movie['year']})")
            
            # Test difficulty filter - easy
            success, response = self.make_request("GET", "/movies/random", params={"difficulty": "easy"})
            if success and response.status_code == 200:
                easy_movie = response.json()
                if easy_movie["difficulty"] == "easy":
                    self.log_test("GET /api/movies/random - Easy Filter", True, f"Got easy movie: {easy_movie['title']}")
                else:
                    self.log_test("GET /api/movies/random - Easy Filter", False, f"Expected easy, got {easy_movie['difficulty']}")
            else:
                self.log_test("GET /api/movies/random - Easy Filter", False, "Failed to get easy movie")
            
            # Test difficulty filter - medium
            success, response = self.make_request("GET", "/movies/random", params={"difficulty": "medium"})
            if success and response.status_code == 200:
                medium_movie = response.json()
                if medium_movie["difficulty"] == "medium":
                    self.log_test("GET /api/movies/random - Medium Filter", True, f"Got medium movie: {medium_movie['title']}")
                else:
                    self.log_test("GET /api/movies/random - Medium Filter", False, f"Expected medium, got {medium_movie['difficulty']}")
            else:
                self.log_test("GET /api/movies/random - Medium Filter", False, "Failed to get medium movie")
            
            # Test difficulty filter - hard
            success, response = self.make_request("GET", "/movies/random", params={"difficulty": "hard"})
            if success and response.status_code == 200:
                hard_movie = response.json()
                if hard_movie["difficulty"] == "hard":
                    self.log_test("GET /api/movies/random - Hard Filter", True, f"Got hard movie: {hard_movie['title']}")
                else:
                    self.log_test("GET /api/movies/random - Hard Filter", False, f"Expected hard, got {hard_movie['difficulty']}")
            else:
                self.log_test("GET /api/movies/random - Hard Filter", False, "Failed to get hard movie")
            
            # Test exclude_ids parameter
            movie_id = movie["id"]
            success, response = self.make_request("GET", "/movies/random", params={"exclude_ids": movie_id})
            if success and response.status_code == 200:
                excluded_movie = response.json()
                if excluded_movie["id"] != movie_id:
                    self.log_test("GET /api/movies/random - Exclude IDs", True, f"Successfully excluded movie ID: {movie_id}")
                else:
                    self.log_test("GET /api/movies/random - Exclude IDs", False, "Exclude IDs parameter not working")
            else:
                self.log_test("GET /api/movies/random - Exclude IDs", False, "Failed to test exclude_ids")
                
        except json.JSONDecodeError:
            self.log_test("GET /api/movies/random - JSON Parse", False, "Invalid JSON response")
    
    def test_create_game_endpoint(self):
        """Test POST /api/games"""
        print("\n=== Testing POST /api/games ===")
        
        game_data = {
            "team_a_players": ["Rajesh", "Priya"],
            "team_b_players": ["Amit", "Sunita"],
            "timer_seconds": 60,
            "total_rounds": 5,
            "difficulty": "all"
        }
        
        success, response = self.make_request("POST", "/games", json=game_data)
        if not success:
            self.log_test("POST /api/games - Connection", False, f"Connection failed: {response}")
            return
            
        if response.status_code != 200:
            self.log_test("POST /api/games - Status Code", False, f"Expected 200, got {response.status_code}")
            return
            
        try:
            game = response.json()
            required_fields = ["id", "team_a", "team_b", "settings", "current_turn", "current_round", "status"]
            
            for field in required_fields:
                if field not in game:
                    self.log_test(f"POST /api/games - Field {field}", False, f"Missing field: {field}")
                    return
            
            # Store game ID for later tests
            self.created_game_id = game["id"]
            
            # Verify team setup
            if len(game["team_a"]["players"]) != 2:
                self.log_test("POST /api/games - Team A Players", False, f"Expected 2 players, got {len(game['team_a']['players'])}")
            else:
                self.log_test("POST /api/games - Team A Players", True, "Team A has correct number of players")
                
            if len(game["team_b"]["players"]) != 2:
                self.log_test("POST /api/games - Team B Players", False, f"Expected 2 players, got {len(game['team_b']['players'])}")
            else:
                self.log_test("POST /api/games - Team B Players", True, "Team B has correct number of players")
            
            # Verify settings
            if game["settings"]["timer_seconds"] != 60:
                self.log_test("POST /api/games - Timer Setting", False, f"Expected 60, got {game['settings']['timer_seconds']}")
            else:
                self.log_test("POST /api/games - Timer Setting", True, "Timer setting correct")
                
            if game["settings"]["total_rounds"] != 5:
                self.log_test("POST /api/games - Rounds Setting", False, f"Expected 5, got {game['settings']['total_rounds']}")
            else:
                self.log_test("POST /api/games - Rounds Setting", True, "Rounds setting correct")
            
            # Verify initial state
            if game["current_turn"] != "team_a":
                self.log_test("POST /api/games - Initial Turn", False, f"Expected team_a, got {game['current_turn']}")
            else:
                self.log_test("POST /api/games - Initial Turn", True, "Initial turn is team_a")
                
            if game["current_round"] != 1:
                self.log_test("POST /api/games - Initial Round", False, f"Expected 1, got {game['current_round']}")
            else:
                self.log_test("POST /api/games - Initial Round", True, "Initial round is 1")
                
            if game["status"] != "active":
                self.log_test("POST /api/games - Initial Status", False, f"Expected active, got {game['status']}")
            else:
                self.log_test("POST /api/games - Initial Status", True, "Initial status is active")
                
            self.log_test("POST /api/games - Game Creation", True, f"Game created with ID: {game['id']}")
            
        except json.JSONDecodeError:
            self.log_test("POST /api/games - JSON Parse", False, "Invalid JSON response")
    
    def test_get_game_endpoint(self):
        """Test GET /api/games/{game_id}"""
        print("\n=== Testing GET /api/games/{game_id} ===")
        
        if not self.created_game_id:
            self.log_test("GET /api/games/{id} - Prerequisites", False, "No game ID available from previous test")
            return
            
        success, response = self.make_request("GET", f"/games/{self.created_game_id}")
        if not success:
            self.log_test("GET /api/games/{id} - Connection", False, f"Connection failed: {response}")
            return
            
        if response.status_code != 200:
            self.log_test("GET /api/games/{id} - Status Code", False, f"Expected 200, got {response.status_code}")
            return
            
        try:
            game = response.json()
            if game["id"] == self.created_game_id:
                self.log_test("GET /api/games/{id} - Game Retrieval", True, f"Successfully retrieved game: {game['id']}")
            else:
                self.log_test("GET /api/games/{id} - Game Retrieval", False, f"ID mismatch: expected {self.created_game_id}, got {game['id']}")
                
        except json.JSONDecodeError:
            self.log_test("GET /api/games/{id} - JSON Parse", False, "Invalid JSON response")
    
    def test_submit_turn_endpoint(self):
        """Test POST /api/games/{game_id}/turn"""
        print("\n=== Testing POST /api/games/{game_id}/turn ===")
        
        if not self.created_game_id:
            self.log_test("POST /api/games/{id}/turn - Prerequisites", False, "No game ID available from previous test")
            return
        
        # Test correct answer
        turn_data = {
            "game_id": self.created_game_id,
            "correct": True
        }
        
        success, response = self.make_request("POST", f"/games/{self.created_game_id}/turn", json=turn_data)
        if not success:
            self.log_test("POST /api/games/{id}/turn - Connection", False, f"Connection failed: {response}")
            return
            
        if response.status_code != 200:
            self.log_test("POST /api/games/{id}/turn - Status Code", False, f"Expected 200, got {response.status_code}")
            return
            
        try:
            game = response.json()
            
            # Check if score was updated (Team A should have 1 point)
            if game["team_a"]["score"] != 1:
                self.log_test("POST /api/games/{id}/turn - Score Update", False, f"Expected Team A score 1, got {game['team_a']['score']}")
            else:
                self.log_test("POST /api/games/{id}/turn - Score Update", True, "Team A score updated correctly")
            
            # Check if turn switched to team_b
            if game["current_turn"] != "team_b":
                self.log_test("POST /api/games/{id}/turn - Turn Switch", False, f"Expected team_b, got {game['current_turn']}")
            else:
                self.log_test("POST /api/games/{id}/turn - Turn Switch", True, "Turn switched to team_b")
            
            # Test skip (incorrect answer)
            turn_data["correct"] = False
            success, response = self.make_request("POST", f"/games/{self.created_game_id}/turn", json=turn_data)
            if success and response.status_code == 200:
                game = response.json()
                
                # Team B score should remain 0
                if game["team_b"]["score"] != 0:
                    self.log_test("POST /api/games/{id}/turn - Skip Score", False, f"Expected Team B score 0, got {game['team_b']['score']}")
                else:
                    self.log_test("POST /api/games/{id}/turn - Skip Score", True, "Team B score unchanged on skip")
                
                # Turn should switch back to team_a and round should increment
                if game["current_turn"] != "team_a":
                    self.log_test("POST /api/games/{id}/turn - Turn Switch Back", False, f"Expected team_a, got {game['current_turn']}")
                else:
                    self.log_test("POST /api/games/{id}/turn - Turn Switch Back", True, "Turn switched back to team_a")
                
                if game["current_round"] != 2:
                    self.log_test("POST /api/games/{id}/turn - Round Increment", False, f"Expected round 2, got {game['current_round']}")
                else:
                    self.log_test("POST /api/games/{id}/turn - Round Increment", True, "Round incremented correctly")
            else:
                self.log_test("POST /api/games/{id}/turn - Skip Test", False, "Failed to test skip functionality")
                
        except json.JSONDecodeError:
            self.log_test("POST /api/games/{id}/turn - JSON Parse", False, "Invalid JSON response")
    
    def test_add_used_movie_endpoint(self):
        """Test POST /api/games/{game_id}/add-used-movie"""
        print("\n=== Testing POST /api/games/{game_id}/add-used-movie ===")
        
        if not self.created_game_id:
            self.log_test("POST /api/games/{id}/add-used-movie - Prerequisites", False, "No game ID available")
            return
        
        # First get a movie ID
        success, response = self.make_request("GET", "/movies/random")
        if not success or response.status_code != 200:
            self.log_test("POST /api/games/{id}/add-used-movie - Get Movie", False, "Failed to get movie for test")
            return
            
        movie = response.json()
        movie_id = movie["id"]
        
        success, response = self.make_request("POST", f"/games/{self.created_game_id}/add-used-movie", params={"movie_id": movie_id})
        if not success:
            self.log_test("POST /api/games/{id}/add-used-movie - Connection", False, f"Connection failed: {response}")
            return
            
        if response.status_code != 200:
            self.log_test("POST /api/games/{id}/add-used-movie - Status Code", False, f"Expected 200, got {response.status_code}")
            return
            
        try:
            result = response.json()
            if "message" in result:
                self.log_test("POST /api/games/{id}/add-used-movie - Success", True, f"Added movie {movie_id} to used list")
            else:
                self.log_test("POST /api/games/{id}/add-used-movie - Response", False, "Unexpected response format")
                
        except json.JSONDecodeError:
            self.log_test("POST /api/games/{id}/add-used-movie - JSON Parse", False, "Invalid JSON response")
    
    def test_delete_game_endpoint(self):
        """Test DELETE /api/games/{game_id}"""
        print("\n=== Testing DELETE /api/games/{game_id} ===")
        
        if not self.created_game_id:
            self.log_test("DELETE /api/games/{id} - Prerequisites", False, "No game ID available")
            return
        
        success, response = self.make_request("DELETE", f"/games/{self.created_game_id}")
        if not success:
            self.log_test("DELETE /api/games/{id} - Connection", False, f"Connection failed: {response}")
            return
            
        if response.status_code != 200:
            self.log_test("DELETE /api/games/{id} - Status Code", False, f"Expected 200, got {response.status_code}")
            return
            
        try:
            result = response.json()
            if "message" in result:
                self.log_test("DELETE /api/games/{id} - Success", True, f"Game {self.created_game_id} deleted successfully")
                
                # Verify game is actually deleted
                success, response = self.make_request("GET", f"/games/{self.created_game_id}")
                if success and response.status_code == 404:
                    self.log_test("DELETE /api/games/{id} - Verification", True, "Game no longer exists")
                else:
                    self.log_test("DELETE /api/games/{id} - Verification", False, "Game still exists after deletion")
            else:
                self.log_test("DELETE /api/games/{id} - Response", False, "Unexpected response format")
                
        except json.JSONDecodeError:
            self.log_test("DELETE /api/games/{id} - JSON Parse", False, "Invalid JSON response")
    
    def run_all_tests(self):
        """Run all API tests"""
        print(f"🎬 Starting Dumb Charades Hindi Movie Game API Tests")
        print(f"🌐 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Run tests in order
        self.test_stats_endpoint()
        self.test_random_movie_endpoint()
        self.test_create_game_endpoint()
        self.test_get_game_endpoint()
        self.test_submit_turn_endpoint()
        self.test_add_used_movie_endpoint()
        self.test_delete_game_endpoint()
        
        # Summary
        print("\n" + "=" * 60)
        print("🎯 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if total - passed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        return passed == total

if __name__ == "__main__":
    tester = APITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)