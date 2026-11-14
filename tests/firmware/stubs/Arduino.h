#pragma once
#include <cmath>
#include <cstdlib>
#include <cstring>
#include <cstdio>
#include <algorithm>
#include <string>
#include <sstream>
#include <iostream>
#include <cstdint>
using byte=unsigned char;using std::isnan;using std::min;using std::max;
#define A0 14
#define A1 15
#define A2 16
#define LOW 0
#define HIGH 1
#define INPUT 0
#define OUTPUT 1
#define F(x) x
unsigned long fakeTime=10000;int pinValues[32]={0};
unsigned long millis(){return fakeTime;}void delay(unsigned long n){fakeTime+=n;}void delayMicroseconds(unsigned int n){}void pinMode(int,int){}void digitalWrite(int p,int v){pinValues[p]=v;}int analogRead(int p){return p==A0?640:400;}
long map(long x,long a,long b,long c,long d){return (x-a)*(d-c)/(b-a)+c;}
template<class T> T constrain(T x,T lo,T hi){return std::min(hi,std::max(lo,x));}
struct SerialMock{std::string input;std::ostringstream out;void begin(int){}int available(){return input.size();}char read(){char c=input[0];input.erase(0,1);return c;}template<class T>void print(T v){out<<v;}void print(float v,int){out<<v;}template<class T>void println(T v){out<<v<<'\n';}void println(){out<<'\n';}}Serial;
