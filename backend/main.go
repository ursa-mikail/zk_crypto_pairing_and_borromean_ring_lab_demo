package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
)

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func decode(r *http.Request, v any) bool {
	return json.NewDecoder(http.MaxBytesReader(nil, r.Body, 1<<16)).Decode(v) == nil
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, map[string]bool{"ok": true}) })
	mux.HandleFunc("POST /api/zk", zkHandler)
	mux.HandleFunc("POST /api/csidh", csidhHandler)
	mux.HandleFunc("POST /api/ring", ringHandler)
	mux.HandleFunc("POST /api/group", groupHandler)
	web := os.Getenv("WEB_DIR")
	if web == "" {
		web = "/app/web"
	}
	mux.Handle("/", http.FileServer(http.Dir(web)))
	port := os.Getenv("PORT")
	if port == "" {
		port = "8470"
	}
	log.Println("Crypto Lab listening on :" + port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}
