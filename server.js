const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Trie = require("./trie");
const path = require("path");
require("dotenv").config();

const app = express();

// CORS configuration
app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || "*", // Set ALLOWED_ORIGIN in your .env file for production
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
}));

app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {})
  .then(async () => {
    console.log("✅ MongoDB Connected");
    await loadWords();  // Load words into Trie after DB connection
  })
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// Mongoose schema and model
const wordSchema = new mongoose.Schema({ word: String });
const Word = mongoose.model("Word", wordSchema);

// Initialize Trie
const trie = new Trie();

// Load words into Trie
async function loadWords() {
    try {
        const words = await Word.find();
        words.forEach(doc => trie.insert(doc.word.toLowerCase()));
        console.log(`✅ Loaded ${words.length} words into Trie`);
    } catch (err) {
        console.error("❌ Error loading words:", err);
    }
}

// Serve the main page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Search endpoint
app.get("/search", (req, res) => {
    const { query } = req.query;
    if (!query) return res.json([]);
    const suggestions = trie.search(query.toLowerCase());
    res.json(suggestions);
});

// Add word endpoint
app.post("/add-word", async (req, res) => {
    try {
        const { word } = req.body;
        if (!word || typeof word !== "string") {
            return res.status(400).json({ error: "Invalid word" });
        }

        const lowerWord = word.toLowerCase();
        const existingWord = await Word.findOne({ word: lowerWord });

        if (!existingWord) {
            const newWord = new Word({ word: lowerWord });
            await newWord.save();
            trie.insert(lowerWord);
            res.json({ message: `✅ Word "${lowerWord}" added successfully!` });
        } else {
            res.json({ message: `⚠️ Word "${lowerWord}" already exists.` });
        }
    } catch (err) {
        console.error("❌ Error adding word:", err);  
        res.status(500).json({ error: "❌ Server error while adding word" });
    }
});

// Recent words endpoint
app.get("/recent-words", async (req, res) => {
    try {
        const recentWords = await Word.find().sort({ _id: -1 }).limit(5);
        res.json(recentWords.map(doc => doc.word));
    } catch (err) {
        res.status(500).json({ error: "❌ Server error while fetching words" });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
