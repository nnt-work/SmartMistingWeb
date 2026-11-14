#include "Arduino.h"
#include "../../arduino/SmartMisting_PRJ301/SmartMisting_PRJ301.ino"
int tests=0;
void check(bool b,const char*s){tests++;if(!b){std::cerr<<"FAIL "<<s<<"\n";std::exit(1);}}
void ready(){fakeTime+=4000;sensorsReady=soilOk=waterOk=dhtOk=true;airTempC=26;airHumPct=55;soilPercent=45;waterPercent=80;lastPumpSwitchTime=0;pumpOn=false;autoMode=true;manualRequestedOn=false;manualPulseMs=0;}
void cmd(const char*s){char b[100];strcpy(b,s);processCommand(b);}
int main(){
 ready();controlPump();check(pumpOn&&pinValues[8]==LOW,"RH55 on active low");airHumPct=60;controlPump();check(pumpOn,"60 hold ON");airHumPct=69;controlPump();check(pumpOn,"69 hold ON");airHumPct=70;controlPump();check(!pumpOn&&pinValues[8]==HIGH,"70 off active high");airHumPct=65;controlPump();check(!pumpOn,"65 hold OFF");
 ready();airTempC=17.9;controlPump();check(!pumpOn,"cold lock");ready();soilPercent=66;controlPump();check(!pumpOn,"wet lock");ready();waterPercent=19;controlPump();check(!pumpOn,"low water lock");ready();dhtOk=false;controlPump();check(!pumpOn,"DHT lock");ready();airTempC=18;soilPercent=65;waterPercent=20;controlPump();check(pumpOn,"exact boundaries allowed");
 ready();autoMode=false;airHumPct=80;cmd("PUMP_ON");check(pumpOn,"manual RH bypass with safety");cmd("STOP");check(!pumpOn&&!autoMode,"STOP persistent MANUAL");fakeTime+=3000;controlPump();check(!pumpOn,"STOP no restart");
 ready();autoMode=false;cmd("RUN:10");check(pumpOn&&manualPulseMs==10000,"manual timed pulse");fakeTime+=10001;controlPump();check(!pumpOn&&!manualRequestedOn,"Arduino timer expires");
 ready();cmd("RUN:10");check(!pumpOn,"RUN rejected AUTO");ready();autoMode=false;waterPercent=19;cmd("RUN:10");check(!pumpOn,"RUN water safety");ready();cmd("BOUNDS:60,70");check(humidityOn==60&&humidityOff==70,"bounds accepted");cmd("BOUNDS:80,70");check(humidityOn==60,"invalid bounds ignored");ready();Serial.input=std::string(70,'X')+"\n";checkSerial();check(!pumpOn&&commandIndex==0&&!commandOverflow,"overflow discarded");
 std::cout<<"PASS "<<tests<<" firmware host assertions using actual .ino source (not AVR/board test)\n";
}
