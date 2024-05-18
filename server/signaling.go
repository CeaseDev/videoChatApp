
package server

import (
	"encoding/json"
	"github.com/gorilla/websocket"
	"log"
	"net/http"
	"fmt"
)

// AllRooms is the global hashmap for the server
var AllRooms RoomMap

// CreateRoomRequestHandler Create a Room and return roomID
func CreateRoomRequestHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	roomID := AllRooms.CreateRoom()

	type resp struct {
		RoomID string `json:"room_id"`
	}

	log.Println(AllRooms.Map)
	json.NewEncoder(w).Encode(resp{RoomID: roomID})
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type broadcastMsg struct {
	Message map[string]interface{}
	RoomID  string
	Client    *websocket.Conn
}

var broadcast = make(chan broadcastMsg)

func init() {
    // Start the broadcaster goroutine when the package is initialized
    go broadcaster()
}


func broadcaster() {
	for {
		msg := <- broadcast

		for _, client := range AllRooms.Map[msg.RoomID] {
			if(client.Conn != msg.Client) {
				err := client.Conn.WriteJSON(msg.Message)

				if err != nil {
					log.Fatal(err)
					client.Conn.Close()
				}
			}
		}
	}
}


// JoinRoomRequestHandler will join the client in a particular room
func JoinRoomRequestHandler(w http.ResponseWriter, r *http.Request) {
	roomID, ok := r.URL.Query()["roomID"]

	if !ok {
		log.Println("roomID missing in URL Parameters")
		return
	}

	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket Upgrade Error:", err)
		return
	}

	AllRooms.InsertIntoRoom(roomID[0], false, ws)

	go func() {
		defer func() {
			AllRooms.RemoveParticipant(roomID[0], ws)
			ws.Close()
		}()

		for {
			var msg broadcastMsg

			err := ws.ReadJSON(&msg.Message)
			if err != nil {
				log.Println("Read Error: ", err)
				break
			}

			msg.Client = ws
			msg.RoomID = roomID[0]

			broadcast <- msg
		}
	}()
}

