#include <Arduino.h>
#include <Servo.h>
#include <WiFi.h>

#define PUMP_PIN 16
#define SERVO_PIN 17
#define SENSOR_PIN 32
#define SERVER_TIMEOUT_MS 2000

#define WIFI_SSID       "Chipottle"
#define WIFI_PASSWORD   "g7jxlkkmq9"

WiFiServer server(80);
Servo servo;

void setup() {
    Serial.begin(115200);
    
    // Connect to Wi-Fi network with SSID and password
    Serial.print("Connecting to ");
    Serial.println(WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        Serial.print(".");
    }
    // Print local IP address and start web server
    Serial.println("");
    Serial.println("WiFi connected.");
    Serial.println("IP address: ");
    Serial.println(WiFi.localIP());
    server.begin();

    pinMode(PUMP_PIN, OUTPUT);
    pinMode(SENSOR_PIN, INPUT);

    digitalWrite(PUMP_PIN, HIGH);
}

void loop() {
    WiFiClient client = server.available();   // Listen for incoming clients

    // If a new client connects
    if (client)
    {
        String currentLine;
        String header;
        uint64_t currentTime = millis();
        uint64_t previousTime = currentTime;
        
        // loop while the client's connected
        while (client.connected() && currentTime - previousTime <= SERVER_TIMEOUT_MS)
        { 
            currentTime = millis();

            // if there's bytes to read from the client 
            if (client.available())
            {             
                char c = client.read();             // read a byte, then
                Serial.write(c);                    // print it out the serial monitor
                header += c;

                if (c == '\n')
                {
                    // if the byte is a newline character
                    // if the current line is blank, you got two newline characters in a row.
                    // that's the end of the client HTTP request, so send a response:
                    if (currentLine.length() == 0)
                    {
                        if (header.startsWith("POST /water/on"))
                        {
                            digitalWrite(PUMP_PIN, LOW);

                            client.println("HTTP/1.1 200 OK");
                            client.println("Content-type:text/plain");
                            client.println("Connection: close");
                            client.println();
                        }
                        else if (header.startsWith("POST /water/off"))
                        {
                            digitalWrite(PUMP_PIN, HIGH);

                            client.println("HTTP/1.1 200 OK");
                            client.println("Content-type:text/plain");
                            client.println("Connection: close");
                            client.println();
                        }
                        else if (header.startsWith("POST /light"))
                        {
                            delay(100);
                            servo.attach(SERVO_PIN);
                            servo.write(180);
                            delay(500);
                            servo.write(0);
                            delay(500);
                            servo.detach();
                            delay(100);

                            client.println("HTTP/1.1 200 OK");
                            client.println("Content-type:text/plain");
                            client.println("Connection: close");
                            client.println();
                        }
                        else if (header.startsWith("GET /moisture"))
                        {
                            const uint16_t value = analogRead(SENSOR_PIN);

                            client.println("HTTP/1.1 200 OK");
                            client.println("Content-type:text/plain");
                            client.println("Connection: close");
                            client.println();
                            client.println(value);
                            client.println();
                        }
                        else if (header.startsWith("GET"))
                        {
                            client.println("HTTP/1.1 418 I'm a teapot");
                            client.println("Content-type:text/plain");
                            client.println("Connection: close");
                            client.println();
                        }
                        else
                        {
                            client.println("HTTP/1.1 400 Bad Request");
                            client.println("Content-type:text/plain");
                            client.println("Connection: close");
                            client.println();
                        }
                        
                        // Break out of the while loop
                        break;
                    }
                    else
                    {
                        // if you got a newline, then clear currentLine
                        currentLine = "";
                    }
                }
                else if (c != '\r')
                {
                    // if you got anything else but a carriage return character,
                    currentLine += c;      // add it to the end of the currentLine
                }
            }
        }
        // Clear the header variable
        header = "";
        // Close the connection
        client.stop();
        Serial.println("Client disconnected.");
        Serial.println("");
    }
}