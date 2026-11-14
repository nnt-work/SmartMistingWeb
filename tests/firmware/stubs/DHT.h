#pragma once
#define DHT11 11
struct DHT{DHT(int,int){}void begin(){}float readTemperature(){return 26;}float readHumidity(){return 55;}};
