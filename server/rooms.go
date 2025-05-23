
package server

import (
	"github.com/gorilla/websocket"
	"log"
	"sync"
	"math/rand"
	"time"
)

// Participant describes a single entity in the hashmap
type Participant struct {
	Host bool
	Conn *websocket.Conn
}

// RoomMap is the main hashmap [roomID string] -> [[]Participant]
type RoomMap struct {
	Mutex sync.RWMutex
	Map map[string][]Participant
}

// Init initialises the RoomMap struct
func (r *RoomMap) Init() {
	r.Map = make(map[string][]Participant)
}

// Get will return the array of participants in the room
func (r *RoomMap) Get(roomID string) []Participant {
	r.Mutex.RLock()
	defer r.Mutex.RUnlock()

	return r.Map[roomID]
}

// CreateRoom generate a unique room ID and return it -> insert it in the hashmap
func (r *RoomMap) CreateRoom() string {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	rand.Seed(time.Now().UnixNano())
	var letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890")
	b := make([]rune, 8)

	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}

	roomID := string(b)
	r.Map[roomID] = []Participant{}

	return roomID
}

// InsertIntoRoom will create a participant and add it in the hashmap 
func (r *RoomMap) InsertIntoRoom(roomID string, host bool, conn *websocket.Conn) {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	p := Participant{host, conn}

	log.Println("Inserting into Room with RoomID: ", roomID)
	r.Map[roomID] = append(r.Map[roomID], p);
}

// DeleteRoom deletes the room with the roomID
func (r *RoomMap) DeleteRoom(roomID string) {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	delete(r.Map, roomID)
}


func (r *RoomMap) RemoveParticipant(roomID string, conn *websocket.Conn) {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	participants := r.Map[roomID]
	for i, participant := range participants {
		if participant.Conn == conn {
			r.Map[roomID] = append(participants[:i], participants[i+1:]...)
			break
		}
	}

	if len(r.Map[roomID]) == 0 {
		delete(r.Map, roomID)
	} else {
		// Broadcast join message to remaining participants
		for _, participant := range r.Map[roomID] {
			err := participant.Conn.WriteJSON(map[string]bool{"join": true})
			if err != nil {
				log.Println("Error broadcasting join message:", err)
			}
		}
	}
}