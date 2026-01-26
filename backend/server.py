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

# ==================== HINDI MOVIES DATABASE ====================

HINDI_MOVIES = [
    # Easy - Popular Blockbusters
    {"title": "Dilwale Dulhania Le Jayenge", "year": 1995, "hero": "Shah Rukh Khan", "heroine": "Kajol", "difficulty": "easy", "genre": "Romance"},
    {"title": "Sholay", "year": 1975, "hero": "Amitabh Bachchan", "heroine": "Hema Malini", "difficulty": "easy", "genre": "Action"},
    {"title": "3 Idiots", "year": 2009, "hero": "Aamir Khan", "heroine": "Kareena Kapoor", "difficulty": "easy", "genre": "Comedy"},
    {"title": "Kuch Kuch Hota Hai", "year": 1998, "hero": "Shah Rukh Khan", "heroine": "Kajol", "difficulty": "easy", "genre": "Romance"},
    {"title": "Dangal", "year": 2016, "hero": "Aamir Khan", "heroine": "Fatima Sana Shaikh", "difficulty": "easy", "genre": "Sports"},
    {"title": "Baahubali", "year": 2015, "hero": "Prabhas", "heroine": "Anushka Shetty", "difficulty": "easy", "genre": "Action"},
    {"title": "PK", "year": 2014, "hero": "Aamir Khan", "heroine": "Anushka Sharma", "difficulty": "easy", "genre": "Comedy"},
    {"title": "Bajrangi Bhaijaan", "year": 2015, "hero": "Salman Khan", "heroine": "Kareena Kapoor", "difficulty": "easy", "genre": "Drama"},
    {"title": "Kabhi Khushi Kabhie Gham", "year": 2001, "hero": "Shah Rukh Khan", "heroine": "Kajol", "difficulty": "easy", "genre": "Drama"},
    {"title": "Lagaan", "year": 2001, "hero": "Aamir Khan", "heroine": "Gracy Singh", "difficulty": "easy", "genre": "Sports"},
    {"title": "Hum Aapke Hain Koun", "year": 1994, "hero": "Salman Khan", "heroine": "Madhuri Dixit", "difficulty": "easy", "genre": "Romance"},
    {"title": "Dil To Pagal Hai", "year": 1997, "hero": "Shah Rukh Khan", "heroine": "Madhuri Dixit", "difficulty": "easy", "genre": "Romance"},
    {"title": "Zindagi Na Milegi Dobara", "year": 2011, "hero": "Hrithik Roshan", "heroine": "Katrina Kaif", "difficulty": "easy", "genre": "Drama"},
    {"title": "Dhoom 2", "year": 2006, "hero": "Hrithik Roshan", "heroine": "Aishwarya Rai", "difficulty": "easy", "genre": "Action"},
    {"title": "Ghajini", "year": 2008, "hero": "Aamir Khan", "heroine": "Asin", "difficulty": "easy", "genre": "Action"},
    {"title": "Chennai Express", "year": 2013, "hero": "Shah Rukh Khan", "heroine": "Deepika Padukone", "difficulty": "easy", "genre": "Comedy"},
    {"title": "Jab We Met", "year": 2007, "hero": "Shahid Kapoor", "heroine": "Kareena Kapoor", "difficulty": "easy", "genre": "Romance"},
    {"title": "Rang De Basanti", "year": 2006, "hero": "Aamir Khan", "heroine": "Soha Ali Khan", "difficulty": "easy", "genre": "Drama"},
    {"title": "Dil Chahta Hai", "year": 2001, "hero": "Aamir Khan", "heroine": "Preity Zinta", "difficulty": "easy", "genre": "Drama"},
    {"title": "Taare Zameen Par", "year": 2007, "hero": "Aamir Khan", "heroine": "Tisca Chopra", "difficulty": "easy", "genre": "Drama"},
    {"title": "Kal Ho Naa Ho", "year": 2003, "hero": "Shah Rukh Khan", "heroine": "Preity Zinta", "difficulty": "easy", "genre": "Romance"},
    {"title": "Hum Dil De Chuke Sanam", "year": 1999, "hero": "Salman Khan", "heroine": "Aishwarya Rai", "difficulty": "easy", "genre": "Romance"},
    {"title": "Padmaavat", "year": 2018, "hero": "Shahid Kapoor", "heroine": "Deepika Padukone", "difficulty": "easy", "genre": "Drama"},
    {"title": "War", "year": 2019, "hero": "Hrithik Roshan", "heroine": "Vaani Kapoor", "difficulty": "easy", "genre": "Action"},
    {"title": "Pathaan", "year": 2023, "hero": "Shah Rukh Khan", "heroine": "Deepika Padukone", "difficulty": "easy", "genre": "Action"},
    {"title": "Jawan", "year": 2023, "hero": "Shah Rukh Khan", "heroine": "Nayanthara", "difficulty": "easy", "genre": "Action"},
    {"title": "Animal", "year": 2023, "hero": "Ranbir Kapoor", "heroine": "Rashmika Mandanna", "difficulty": "easy", "genre": "Action"},
    {"title": "Stree", "year": 2018, "hero": "Rajkummar Rao", "heroine": "Shraddha Kapoor", "difficulty": "easy", "genre": "Horror Comedy"},
    {"title": "Singham", "year": 2011, "hero": "Ajay Devgn", "heroine": "Kajal Aggarwal", "difficulty": "easy", "genre": "Action"},
    {"title": "Golmaal", "year": 2006, "hero": "Ajay Devgn", "heroine": "Sharman Joshi", "difficulty": "easy", "genre": "Comedy"},
    {"title": "Drishyam", "year": 2015, "hero": "Ajay Devgn", "heroine": "Shriya Saran", "difficulty": "easy", "genre": "Thriller"},
    {"title": "Om Shanti Om", "year": 2007, "hero": "Shah Rukh Khan", "heroine": "Deepika Padukone", "difficulty": "easy", "genre": "Drama"},
    {"title": "Yeh Jawaani Hai Deewani", "year": 2013, "hero": "Ranbir Kapoor", "heroine": "Deepika Padukone", "difficulty": "easy", "genre": "Romance"},
    {"title": "Barfi", "year": 2012, "hero": "Ranbir Kapoor", "heroine": "Priyanka Chopra", "difficulty": "easy", "genre": "Romance"},
    {"title": "Queen", "year": 2014, "hero": "Rajkummar Rao", "heroine": "Kangana Ranaut", "difficulty": "easy", "genre": "Drama"},
    
    # Medium - Less Popular/Old Classics
    {"title": "Deewar", "year": 1975, "hero": "Amitabh Bachchan", "heroine": "Parveen Babi", "difficulty": "medium", "genre": "Action"},
    {"title": "Amar Akbar Anthony", "year": 1977, "hero": "Amitabh Bachchan", "heroine": "Parveen Babi", "difficulty": "medium", "genre": "Comedy"},
    {"title": "Don", "year": 1978, "hero": "Amitabh Bachchan", "heroine": "Zeenat Aman", "difficulty": "medium", "genre": "Action"},
    {"title": "Silsila", "year": 1981, "hero": "Amitabh Bachchan", "heroine": "Rekha", "difficulty": "medium", "genre": "Drama"},
    {"title": "Lamhe", "year": 1991, "hero": "Anil Kapoor", "heroine": "Sridevi", "difficulty": "medium", "genre": "Romance"},
    {"title": "Chandni", "year": 1989, "hero": "Rishi Kapoor", "heroine": "Sridevi", "difficulty": "medium", "genre": "Romance"},
    {"title": "Mr. India", "year": 1987, "hero": "Anil Kapoor", "heroine": "Sridevi", "difficulty": "medium", "genre": "Action"},
    {"title": "Qayamat Se Qayamat Tak", "year": 1988, "hero": "Aamir Khan", "heroine": "Juhi Chawla", "difficulty": "medium", "genre": "Romance"},
    {"title": "Maine Pyar Kiya", "year": 1989, "hero": "Salman Khan", "heroine": "Bhagyashree", "difficulty": "medium", "genre": "Romance"},
    {"title": "Darr", "year": 1993, "hero": "Shah Rukh Khan", "heroine": "Juhi Chawla", "difficulty": "medium", "genre": "Thriller"},
    {"title": "Baazigar", "year": 1993, "hero": "Shah Rukh Khan", "heroine": "Kajol", "difficulty": "medium", "genre": "Thriller"},
    {"title": "Kabhi Haan Kabhi Naa", "year": 1994, "hero": "Shah Rukh Khan", "heroine": "Suchitra Krishnamoorthi", "difficulty": "medium", "genre": "Comedy"},
    {"title": "Dil Se", "year": 1998, "hero": "Shah Rukh Khan", "heroine": "Manisha Koirala", "difficulty": "medium", "genre": "Drama"},
    {"title": "Satya", "year": 1998, "hero": "J.D. Chakravarthy", "heroine": "Urmila Matondkar", "difficulty": "medium", "genre": "Crime"},
    {"title": "Company", "year": 2002, "hero": "Ajay Devgn", "heroine": "Manisha Koirala", "difficulty": "medium", "genre": "Crime"},
    {"title": "Gangster", "year": 2006, "hero": "Emraan Hashmi", "heroine": "Kangana Ranaut", "difficulty": "medium", "genre": "Crime"},
    {"title": "Life In A Metro", "year": 2007, "hero": "Shilpa Shetty", "heroine": "Konkona Sen Sharma", "difficulty": "medium", "genre": "Drama"},
    {"title": "Wake Up Sid", "year": 2009, "hero": "Ranbir Kapoor", "heroine": "Konkona Sen Sharma", "difficulty": "medium", "genre": "Drama"},
    {"title": "Paan Singh Tomar", "year": 2012, "hero": "Irrfan Khan", "heroine": "Mahie Gill", "difficulty": "medium", "genre": "Drama"},
    {"title": "The Lunchbox", "year": 2013, "hero": "Irrfan Khan", "heroine": "Nimrat Kaur", "difficulty": "medium", "genre": "Romance"},
    {"title": "Haider", "year": 2014, "hero": "Shahid Kapoor", "heroine": "Shraddha Kapoor", "difficulty": "medium", "genre": "Drama"},
    {"title": "Udaan", "year": 2010, "hero": "Rajat Barmecha", "heroine": "Ram Kapoor", "difficulty": "medium", "genre": "Drama"},
    {"title": "Gangs of Wasseypur", "year": 2012, "hero": "Manoj Bajpayee", "heroine": "Richa Chadha", "difficulty": "medium", "genre": "Crime"},
    {"title": "Raazi", "year": 2018, "hero": "Vicky Kaushal", "heroine": "Alia Bhatt", "difficulty": "medium", "genre": "Thriller"},
    {"title": "Andhadhun", "year": 2018, "hero": "Ayushmann Khurrana", "heroine": "Radhika Apte", "difficulty": "medium", "genre": "Thriller"},
    {"title": "Article 15", "year": 2019, "hero": "Ayushmann Khurrana", "heroine": "Sayani Gupta", "difficulty": "medium", "genre": "Drama"},
    {"title": "Gully Boy", "year": 2019, "hero": "Ranveer Singh", "heroine": "Alia Bhatt", "difficulty": "medium", "genre": "Drama"},
    {"title": "Tumbbad", "year": 2018, "hero": "Sohum Shah", "heroine": "Jyoti Malshe", "difficulty": "medium", "genre": "Horror"},
    {"title": "Newton", "year": 2017, "hero": "Rajkummar Rao", "heroine": "Anjali Patil", "difficulty": "medium", "genre": "Drama"},
    {"title": "Masaan", "year": 2015, "hero": "Vicky Kaushal", "heroine": "Richa Chadha", "difficulty": "medium", "genre": "Drama"},
    {"title": "Toilet Ek Prem Katha", "year": 2017, "hero": "Akshay Kumar", "heroine": "Bhumi Pednekar", "difficulty": "medium", "genre": "Comedy"},
    {"title": "Badhaai Ho", "year": 2018, "hero": "Ayushmann Khurrana", "heroine": "Sanya Malhotra", "difficulty": "medium", "genre": "Comedy"},
    {"title": "Shubh Mangal Zyada Saavdhan", "year": 2020, "hero": "Ayushmann Khurrana", "heroine": "Jitendra Kumar", "difficulty": "medium", "genre": "Comedy"},
    {"title": "Piku", "year": 2015, "hero": "Amitabh Bachchan", "heroine": "Deepika Padukone", "difficulty": "medium", "genre": "Comedy"},
    {"title": "Tamasha", "year": 2015, "hero": "Ranbir Kapoor", "heroine": "Deepika Padukone", "difficulty": "medium", "genre": "Drama"},
    {"title": "Rockstar", "year": 2011, "hero": "Ranbir Kapoor", "heroine": "Nargis Fakhri", "difficulty": "medium", "genre": "Drama"},
    {"title": "Lootera", "year": 2013, "hero": "Ranveer Singh", "heroine": "Sonakshi Sinha", "difficulty": "medium", "genre": "Romance"},
    
    # Hard - Obscure/Complex Titles
    {"title": "Jaane Bhi Do Yaaro", "year": 1983, "hero": "Naseeruddin Shah", "heroine": "Bhakti Barve", "difficulty": "hard", "genre": "Comedy"},
    {"title": "Katha", "year": 1983, "hero": "Naseeruddin Shah", "heroine": "Deepti Naval", "difficulty": "hard", "genre": "Drama"},
    {"title": "Ardh Satya", "year": 1983, "hero": "Om Puri", "heroine": "Smita Patil", "difficulty": "hard", "genre": "Drama"},
    {"title": "Mirch Masala", "year": 1987, "hero": "Naseeruddin Shah", "heroine": "Smita Patil", "difficulty": "hard", "genre": "Drama"},
    {"title": "Ankur", "year": 1974, "hero": "Anant Nag", "heroine": "Shabana Azmi", "difficulty": "hard", "genre": "Drama"},
    {"title": "Sparsh", "year": 1980, "hero": "Naseeruddin Shah", "heroine": "Shabana Azmi", "difficulty": "hard", "genre": "Drama"},
    {"title": "Paar", "year": 1984, "hero": "Naseeruddin Shah", "heroine": "Shabana Azmi", "difficulty": "hard", "genre": "Drama"},
    {"title": "Manthan", "year": 1976, "hero": "Girish Karnad", "heroine": "Smita Patil", "difficulty": "hard", "genre": "Drama"},
    {"title": "Bhumika", "year": 1977, "hero": "Amol Palekar", "heroine": "Smita Patil", "difficulty": "hard", "genre": "Drama"},
    {"title": "Ijaazat", "year": 1987, "hero": "Naseeruddin Shah", "heroine": "Rekha", "difficulty": "hard", "genre": "Drama"},
    {"title": "Ek Duuje Ke Liye", "year": 1981, "hero": "Kamal Haasan", "heroine": "Rati Agnihotri", "difficulty": "hard", "genre": "Romance"},
    {"title": "Saaransh", "year": 1984, "hero": "Anupam Kher", "heroine": "Rohini Hattangadi", "difficulty": "hard", "genre": "Drama"},
    {"title": "Jaane Tu Ya Jaane Na", "year": 2008, "hero": "Imran Khan", "heroine": "Genelia D'Souza", "difficulty": "hard", "genre": "Romance"},
    {"title": "Band Baaja Baaraat", "year": 2010, "hero": "Ranveer Singh", "heroine": "Anushka Sharma", "difficulty": "hard", "genre": "Comedy"},
    {"title": "Dev D", "year": 2009, "hero": "Abhay Deol", "heroine": "Mahie Gill", "difficulty": "hard", "genre": "Drama"},
    {"title": "Oye Lucky Lucky Oye", "year": 2008, "hero": "Abhay Deol", "heroine": "Paresh Rawal", "difficulty": "hard", "genre": "Comedy"},
    {"title": "Love Aaj Kal", "year": 2009, "hero": "Saif Ali Khan", "heroine": "Deepika Padukone", "difficulty": "hard", "genre": "Romance"},
    {"title": "Pyaar Ke Side Effects", "year": 2006, "hero": "Rahul Bose", "heroine": "Mallika Sherawat", "difficulty": "hard", "genre": "Comedy"},
    {"title": "Khosla Ka Ghosla", "year": 2006, "hero": "Anupam Kher", "heroine": "Boman Irani", "difficulty": "hard", "genre": "Comedy"},
    {"title": "Johnny Gaddaar", "year": 2007, "hero": "Neil Nitin Mukesh", "heroine": "Rimi Sen", "difficulty": "hard", "genre": "Thriller"},
    {"title": "Maqbool", "year": 2003, "hero": "Irrfan Khan", "heroine": "Tabu", "difficulty": "hard", "genre": "Crime"},
    {"title": "Omkara", "year": 2006, "hero": "Ajay Devgn", "heroine": "Kareena Kapoor", "difficulty": "hard", "genre": "Crime"},
    {"title": "Gulaal", "year": 2009, "hero": "Raj Singh Chaudhary", "heroine": "Jesse Randhawa", "difficulty": "hard", "genre": "Drama"},
    {"title": "Kahaani", "year": 2012, "hero": "Parambrata Chatterjee", "heroine": "Vidya Balan", "difficulty": "hard", "genre": "Thriller"},
    {"title": "Talaash", "year": 2012, "hero": "Aamir Khan", "heroine": "Rani Mukerji", "difficulty": "hard", "genre": "Thriller"},
    {"title": "Shanghai", "year": 2012, "hero": "Emraan Hashmi", "heroine": "Kalki Koechlin", "difficulty": "hard", "genre": "Drama"},
    {"title": "Ishqiya", "year": 2010, "hero": "Naseeruddin Shah", "heroine": "Vidya Balan", "difficulty": "hard", "genre": "Crime"},
    {"title": "Dedh Ishqiya", "year": 2014, "hero": "Naseeruddin Shah", "heroine": "Madhuri Dixit", "difficulty": "hard", "genre": "Crime"},
    {"title": "Aligarh", "year": 2015, "hero": "Manoj Bajpayee", "heroine": "Rajkummar Rao", "difficulty": "hard", "genre": "Drama"},
    {"title": "Trapped", "year": 2017, "hero": "Rajkummar Rao", "heroine": "Geetanjali Thapa", "difficulty": "hard", "genre": "Thriller"},
    {"title": "A Death in the Gunj", "year": 2016, "hero": "Vikrant Massey", "heroine": "Kalki Koechlin", "difficulty": "hard", "genre": "Drama"},
    {"title": "Mukti Bhawan", "year": 2016, "hero": "Adil Hussain", "heroine": "Lalit Behl", "difficulty": "hard", "genre": "Drama"},
    {"title": "Photograph", "year": 2019, "hero": "Nawazuddin Siddiqui", "heroine": "Sanya Malhotra", "difficulty": "hard", "genre": "Romance"},
    {"title": "Thappad", "year": 2020, "hero": "Pavail Gulati", "heroine": "Taapsee Pannu", "difficulty": "hard", "genre": "Drama"},
    {"title": "Bulbbul", "year": 2020, "hero": "Avinash Tiwary", "heroine": "Tripti Dimri", "difficulty": "hard", "genre": "Horror"},
    {"title": "Pagglait", "year": 2021, "hero": "Ashutosh Rana", "heroine": "Sanya Malhotra", "difficulty": "hard", "genre": "Drama"},
    {"title": "Raat Akeli Hai", "year": 2020, "hero": "Nawazuddin Siddiqui", "heroine": "Radhika Apte", "difficulty": "hard", "genre": "Thriller"},
    {"title": "Ludo", "year": 2020, "hero": "Abhishek Bachchan", "heroine": "Rajkummar Rao", "difficulty": "hard", "genre": "Comedy"},
    {"title": "Mimi", "year": 2021, "hero": "Pankaj Tripathi", "heroine": "Kriti Sanon", "difficulty": "hard", "genre": "Comedy"},
    {"title": "Sardar Udham", "year": 2021, "hero": "Vicky Kaushal", "heroine": "Banita Sandhu", "difficulty": "hard", "genre": "Drama"},
]

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
    """Get a random movie, optionally excluding certain IDs"""
    query = {}
    if difficulty and difficulty != "all":
        query["difficulty"] = difficulty
    
    exclude_list = []
    if exclude_ids:
        exclude_list = exclude_ids.split(",")
        query["id"] = {"$nin": exclude_list}
    
    movies = await db.movies.find(query).to_list(1000)
    
    if not movies:
        raise HTTPException(status_code=404, detail="No movies available")
    
    selected = random.choice(movies)
    return Movie(**selected)

@api_router.post("/games", response_model=Game)
async def create_game(request: CreateGameRequest):
    """Create a new game"""
    team_a = Team(
        name="Team A",
        players=[Player(name=name) for name in request.team_a_players],
        score=0
    )
    team_b = Team(
        name="Team B",
        players=[Player(name=name) for name in request.team_b_players],
        score=0
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
    """Add a movie ID to the used movies list"""
    result = await db.games.update_one(
        {"id": game_id},
        {"$push": {"used_movie_ids": movie_id}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Game not found")
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
    
    return {
        "total_movies": total_movies,
        "easy_movies": easy_movies,
        "medium_movies": medium_movies,
        "hard_movies": hard_movies,
        "total_games": total_games
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
