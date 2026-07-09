import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(app.getPath('userData'), 'fl-advisor.db');

let db: Database.Database | null = null;

export function initDatabase() {
  try {
    db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS analyses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        imageBase64 TEXT NOT NULL,
        mimeType TEXT,
        customNotes TEXT,
        analysisResults TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_analyses_timestamp ON analyses(timestamp DESC);
    `);
    
    console.log(`Database initialized at: ${dbPath}`);
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export interface Analysis {
  id?: number;
  imageBase64: string;
  mimeType?: string;
  customNotes?: string;
  analysisResults: string;
  timestamp?: string;
  created_at?: string;
}

export function saveAnalysis(data: Analysis): number {
  try {
    const database = getDatabase();
    
    const stmt = database.prepare(`
      INSERT INTO analyses (imageBase64, mimeType, customNotes, analysisResults, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      data.imageBase64,
      data.mimeType || 'image/png',
      data.customNotes || '',
      data.analysisResults,
      data.timestamp || new Date().toISOString()
    );
    
    return info.lastInsertRowid as number;
  } catch (error) {
    console.error('Error saving analysis:', error);
    throw error;
  }
}

export function getAnalyses(limit: number = 50): Analysis[] {
  try {
    const database = getDatabase();
    
    const stmt = database.prepare(`
      SELECT * FROM analyses
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    
    const results = stmt.all(limit) as Analysis[];
    return results;
  } catch (error) {
    console.error('Error fetching analyses:', error);
    throw error;
  }
}

export function getAnalysisById(id: number): Analysis | undefined {
  try {
    const database = getDatabase();
    
    const stmt = database.prepare(`
      SELECT * FROM analyses WHERE id = ?
    `);
    
    const result = stmt.get(id) as Analysis | undefined;
    return result;
  } catch (error) {
    console.error('Error fetching analysis by id:', error);
    throw error;
  }
}

export function deleteAnalysis(id: number): void {
  try {
    const database = getDatabase();
    
    const stmt = database.prepare(`
      DELETE FROM analyses WHERE id = ?
    `);
    
    stmt.run(id);
  } catch (error) {
    console.error('Error deleting analysis:', error);
    throw error;
  }
}

export function clearAnalyses(): void {
  try {
    const database = getDatabase();
    
    database.exec('DELETE FROM analyses');
  } catch (error) {
    console.error('Error clearing analyses:', error);
    throw error;
  }
}

export function analyzeScreenshotDB(id: number): Analysis | undefined {
  return getAnalysisById(id);
}
