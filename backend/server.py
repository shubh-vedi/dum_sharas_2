from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import random

from movies_database import HINDI_MOVIES

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class Movie(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    year: int
    hero: str
    heroine: str
    word_count: int
    difficulty: str  # easy, medium, hard
    genre: Optional[str] = None

class Player(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str

class Team(BaseModel):
    name: str  # Team A or Team B
    players: List[Player]
    score: int = 0
    current_actor_index: int = 0  # Track which player is acting

class GameSettings(BaseModel):
    timer_seconds: int = 60
    total_rounds: int = 10
    difficulty: str = "all"  # easy, medium, hard, all

class Game(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    team_a: Team
    team_b: Team
    settings: GameSettings
    current_turn: str = "team_a"  # team_a or team_b
    current_round: int = 1
    used_movie_ids: List[str] = []
    status: str = "active"  # active, completed
    winner: Optional[str] = None
    share_code: str = Field(default_factory=lambda: str(uuid.uuid4())[:8].upper())
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CreateGameRequest(BaseModel):
    team_a_players: List[str]
    team_b_players: List[str]
    timer_seconds: int = 60
    total_rounds: int = 10
    difficulty: str = "all"

class TurnResult(BaseModel):
    game_id: str
    correct: bool

class GlobalUsedMovies(BaseModel):
    id: str = "global_used_movies"
    movie_ids: List[str] = []

# ==================== API ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Dumb Charades Hindi Movie Game API"}

@api_router.post("/seed-movies")
async def seed_movies():
    """Seed the database with Hindi movies"""
    # Clear existing movies
    await db.movies.delete_many({})
    
    # Process and insert movies
    movies_to_insert = []
    for movie_data in HINDI_MOVIES:
        word_count = len(movie_data["title"].split())
        movie = Movie(
            title=movie_data["title"],
            year=movie_data["year"],
            hero=movie_data["hero"],
            heroine=movie_data["heroine"],
            word_count=word_count,
            difficulty=movie_data["difficulty"],
            genre=movie_data.get("genre")
        )
        movies_to_insert.append(movie.dict())
    
    await db.movies.insert_many(movies_to_insert)
    return {"message": f"Successfully seeded {len(movies_to_insert)} movies"}

@api_router.get("/movies", response_model=List[Movie])
async def get_all_movies(difficulty: Optional[str] = None):
    """Get all movies, optionally filtered by difficulty"""
    query = {}
    if difficulty and difficulty != "all":
        query["difficulty"] = difficulty
    
    movies = await db.movies.find(query).to_list(1000)
    return [Movie(**movie) for movie in movies]

@api_router.get("/movies/random")
async def get_random_movie(difficulty: str = "all", exclude_ids: Optional[str] = None):
    """Get a random movie, excluding globally used ones and optionally specific IDs"""
    query = {}
    if difficulty and difficulty != "all":
        query["difficulty"] = difficulty
    
    # Get globally used movie IDs
    global_used = await db.global_used_movies.find_one({"id": "global_used_movies"})
    global_used_ids = global_used.get("movie_ids", []) if global_used else []
    
    # Combine with exclude_ids from request
    exclude_list = global_used_ids.copy()
    if exclude_ids:
        exclude_list.extend(exclude_ids.split(","))
    
    if exclude_list:
        query["id"] = {"$nin": exclude_list}
    
    movies = await db.movies.find(query).to_list(1000)
    
    if not movies:
        # If no movies available, reset global used movies
        await db.global_used_movies.update_one(
            {"id": "global_used_movies"},
            {"$set": {"movie_ids": []}},
            upsert=True
        )
        # Retry without exclusions
        query.pop("id", None)
        movies = await db.movies.find(query).to_list(1000)
        if not movies:
            raise HTTPException(status_code=404, detail="No movies available")
    
    selected = random.choice(movies)
    return Movie(**selected)

@api_router.post("/movies/mark-used")
async def mark_movie_used(movie_id: str):
    """Mark a movie as globally used"""
    await db.global_used_movies.update_one(
        {"id": "global_used_movies"},
        {"$addToSet": {"movie_ids": movie_id}},
        upsert=True
    )
    return {"message": "Movie marked as used"}

@api_router.post("/movies/reset-used")
async def reset_used_movies():
    """Reset the globally used movies list"""
    await db.global_used_movies.update_one(
        {"id": "global_used_movies"},
        {"$set": {"movie_ids": []}},
        upsert=True
    )
    return {"message": "Used movies list reset"}

@api_router.post("/games", response_model=Game)
async def create_game(request: CreateGameRequest):
    """Create a new game"""
    team_a = Team(
        name="Team A",
        players=[Player(name=name) for name in request.team_a_players],
        score=0,
        current_actor_index=0
    )
    team_b = Team(
        name="Team B",
        players=[Player(name=name) for name in request.team_b_players],
        score=0,
        current_actor_index=0
    )
    settings = GameSettings(
        timer_seconds=request.timer_seconds,
        total_rounds=request.total_rounds,
        difficulty=request.difficulty
    )
    
    game = Game(
        team_a=team_a,
        team_b=team_b,
        settings=settings
    )
    
    await db.games.insert_one(game.dict())
    return game

@api_router.get("/games/{game_id}", response_model=Game)
async def get_game(game_id: str):
    """Get a game by ID"""
    game = await db.games.find_one({"id": game_id})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return Game(**game)

@api_router.get("/games/share/{share_code}")
async def get_game_by_share_code(share_code: str):
    """Get a game by share code"""
    game = await db.games.find_one({"share_code": share_code.upper()})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return Game(**game)

class JoinTeamRequest(BaseModel):
    team: str  # team_a or team_b
    player_name: str

@api_router.post("/games/{game_id}/join")
async def join_game_team(game_id: str, request: JoinTeamRequest):
    """Join a team in an existing game"""
    game = await db.games.find_one({"id": game_id})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game_obj = Game(**game)
    
    # Create new player
    new_player = Player(name=request.player_name)
    
    # Add to the selected team
    if request.team == "team_a":
        game_obj.team_a.players.append(new_player)
    elif request.team == "team_b":
        game_obj.team_b.players.append(new_player)
    else:
        raise HTTPException(status_code=400, detail="Invalid team")
    
    # Update in database
    await db.games.update_one(
        {"id": game_id},
        {"$set": game_obj.dict()}
    )
    
    return game_obj

@api_router.post("/games/{game_id}/turn")
async def submit_turn(game_id: str, result: TurnResult):
    """Submit a turn result (correct or skip)"""
    game = await db.games.find_one({"id": game_id})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game_obj = Game(**game)
    
    # Update score if correct
    if result.correct:
        if game_obj.current_turn == "team_a":
            game_obj.team_a.score += 1
        else:
            game_obj.team_b.score += 1
    
    # Rotate actor to next player in the current team
    if game_obj.current_turn == "team_a":
        game_obj.team_a.current_actor_index = (game_obj.team_a.current_actor_index + 1) % len(game_obj.team_a.players)
    else:
        game_obj.team_b.current_actor_index = (game_obj.team_b.current_actor_index + 1) % len(game_obj.team_b.players)
    
    # Switch turns
    if game_obj.current_turn == "team_a":
        game_obj.current_turn = "team_b"
    else:
        game_obj.current_turn = "team_a"
        game_obj.current_round += 1
    
    # Check if game is over
    if game_obj.current_round > game_obj.settings.total_rounds:
        game_obj.status = "completed"
        if game_obj.team_a.score > game_obj.team_b.score:
            game_obj.winner = "Team A"
        elif game_obj.team_b.score > game_obj.team_a.score:
            game_obj.winner = "Team B"
        else:
            game_obj.winner = "Draw"
    
    # Update in database
    await db.games.update_one(
        {"id": game_id},
        {"$set": game_obj.dict()}
    )
    
    return game_obj

@api_router.post("/games/{game_id}/add-used-movie")
async def add_used_movie(game_id: str, movie_id: str):
    """Add a movie ID to the used movies list (both game and global)"""
    result = await db.games.update_one(
        {"id": game_id},
        {"$push": {"used_movie_ids": movie_id}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Also mark as globally used
    await db.global_used_movies.update_one(
        {"id": "global_used_movies"},
        {"$addToSet": {"movie_ids": movie_id}},
        upsert=True
    )
    
    return {"message": "Movie added to used list"}

@api_router.delete("/games/{game_id}")
async def delete_game(game_id: str):
    """Delete a game"""
    result = await db.games.delete_one({"id": game_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Game not found")
    return {"message": "Game deleted"}

@api_router.get("/stats")
async def get_stats():
    """Get game statistics"""
    total_movies = await db.movies.count_documents({})
    easy_movies = await db.movies.count_documents({"difficulty": "easy"})
    medium_movies = await db.movies.count_documents({"difficulty": "medium"})
    hard_movies = await db.movies.count_documents({"difficulty": "hard"})
    total_games = await db.games.count_documents({})
    
    # Get count of used movies
    global_used = await db.global_used_movies.find_one({"id": "global_used_movies"})
    used_count = len(global_used.get("movie_ids", [])) if global_used else 0
    
    return {
        "total_movies": total_movies,
        "easy_movies": easy_movies,
        "medium_movies": medium_movies,
        "hard_movies": hard_movies,
        "total_games": total_games,
        "used_movies": used_count,
        "available_movies": total_movies - used_count
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    """Seed movies on startup if database is empty"""
    count = await db.movies.count_documents({})
    if count == 0:
        logger.info("Seeding movies database...")
        movies_to_insert = []
        for movie_data in HINDI_MOVIES:
            word_count = len(movie_data["title"].split())
            movie = Movie(
                title=movie_data["title"],
                year=movie_data["year"],
                hero=movie_data["hero"],
                heroine=movie_data["heroine"],
                word_count=word_count,
                difficulty=movie_data["difficulty"],
                genre=movie_data.get("genre")
            )
            movies_to_insert.append(movie.dict())
        
        await db.movies.insert_many(movies_to_insert)
        logger.info(f"Seeded {len(movies_to_insert)} movies")
    
    # Initialize global used movies if not exists
    existing = await db.global_used_movies.find_one({"id": "global_used_movies"})
    if not existing:
        await db.global_used_movies.insert_one({"id": "global_used_movies", "movie_ids": []})

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
