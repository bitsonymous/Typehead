const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Trie = require("./trie");
const path = require("path");
require("dotenv").config();
const app = express();
app.use(cors());
app.use(express.json());


mongoose.connect(process.env.MONGO_URI, {})
  .then(async () => {
    console.log("✅ MongoDB Connected");
    await loadWords(); 
  })
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

const wordSchema = new mongoose.Schema({ word: String });
const Word = mongoose.model("Word", wordSchema);


const trie = new Trie();

async function loadWords() {
    try {
        const words = await Word.find();
        words.forEach(doc => trie.insert(doc.word.toLowerCase()));
        console.log("✅ Loaded words into Trie");
    } catch (err) {
        console.error("❌ Error loading words:", err);
    }
}


app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});


app.use(express.static(path.join(__dirname, "public")));


app.get("/search", (req, res) => {
    const { query } = req.query;
    if (!query) return res.json([]);
    const suggestions = trie.search(query.toLowerCase());
    res.json(suggestions);
});


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



app.get("/recent-words", async (req, res) => {
    try {
        const recentWords = await Word.find().sort({ _id: -1 }).limit(5);
        res.json(recentWords.map(doc => doc.word));
    } catch (err) {
        res.status(500).json({ error: "❌ Server error while fetching words" });
    }
});

console.log(`✅ Loaded ${words.length} words into Trie`);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
