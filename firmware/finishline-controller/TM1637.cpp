/*
 * TM1637.cpp
 * A library for the 4 digit display
 *
 * Copyright (c) 2012 seeed technology inc.
 * Website    : www.seeed.cc
 * Author     : Frankie.Chu, Michael Rommel
 * Create Time: 9 April 2012
 * Change Log : Extended for Pinewood Derby Project by Michael Rommel
 *
 * The MIT License (MIT)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

#include "TM1637.h"
#include <Arduino.h>


static const byte digit[30] = {
  // bitfield with LSB = first segment and MSB = last segment
  // 0x0 up to 0xf = hexadecimal characters
  // Special characters, see constants in .h file
  0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f, // 0-9
  0x77, 0x7c, 0x39, 0x5e, 0x79, 0x71, 0x74, 0x76, 0x0e, 0x38, // A-L
  0x54, 0x5c, 0x73, 0x50, 0x78, 0x1c, 0x3e, 0x6e, 0x40, 0x0   // n-OFF
};


TM1637::TM1637(uint8_t Clk, uint8_t Data)
{
    Clkpin = Clk;
    Datapin = Data;
    pinMode(Clkpin,OUTPUT);
    pinMode(Datapin,OUTPUT);
}

// Shows a time provided in millis
// formatted as seconds with decimal points
// Takes numbers up to 999999 millis
void TM1637::DigitDisplayWrite( uint32_t num )
{

    if( num < 0 || num > 1000000 ) return;

    if( num<10 )
    {
	display(3, num);
	display(2, 0);
	display(1, 0);
	point( POINT_ON );
	display(0, 0);
	point( POINT_OFF );
    }
    else if( num<100 )
    {
	display(3, num%10);
	display(2, (num/10)%10);
	display(1, 0);
	point( POINT_ON );
	display(0, 0);
	point( POINT_OFF );
    }
    else if( num<1000 )
    {
	display(3, num%10);
	display(2, (num/10)%10);
	display(1, (num/100)%10);
	point( POINT_ON );
	display(0, 0);
	point( POINT_OFF );
    }
    else if( num<10000 )
    {
	display(3, num%10);
	display(2, (num/10)%10);
	display(1, (num/100)%10);
	point( POINT_ON );
	display(0, (num/1000)%10);
	point( POINT_OFF );
    }
    else if(num<100000)
    {
	display(3, (num/10)%10);
	display(2, (num/100)%10);
	point( POINT_ON );
	display(1, (num/1000)%10);
	point( POINT_OFF );
	display(0, (num/10000)%10);
    }
    else
    {
	display(3, (num/100)%10);
	point( POINT_ON );
	display(2, (num/1000)%10);
	point( POINT_OFF );
	display(1, (num/10000)%10);
	display(0, (num/100000)%10);
    }
}


int TM1637::writeByte(int8_t wr_data)
{
    uint8_t i;
    for(i=0;i<8;i++)        //sent 8bit data
    {
        digitalWrite(Clkpin,LOW);
        if(wr_data & 0x01)digitalWrite(Datapin,HIGH);//LSB first
        else digitalWrite(Datapin,LOW);
        wr_data >>= 1;
        digitalWrite(Clkpin,HIGH);

    }
    digitalWrite(Clkpin,LOW); //wait for the ACK
    digitalWrite(Datapin,HIGH);
    digitalWrite(Clkpin,HIGH);
    pinMode(Datapin,INPUT);

    bitDelay();
    uint8_t ack = digitalRead(Datapin);
    if (ack == 0)
    {
        pinMode(Datapin,OUTPUT);
        digitalWrite(Datapin,LOW);
    }
    bitDelay();
    pinMode(Datapin,OUTPUT);
    bitDelay();

    return ack;
}


//send start signal to TM1637
void TM1637::start(void)
{
    digitalWrite(Clkpin,HIGH);//send start signal to TM1637
    digitalWrite(Datapin,HIGH);
    digitalWrite(Datapin,LOW);
    digitalWrite(Clkpin,LOW);
}


//End of transmission
void TM1637::stop(void)
{
    digitalWrite(Clkpin,LOW);
    digitalWrite(Datapin,LOW);
    digitalWrite(Clkpin,HIGH);
    digitalWrite(Datapin,HIGH);
}


//display function.Write to full-screen.
void TM1637::display(int8_t DispData[])
{
    int8_t SegData[4];
    uint8_t i;
    for(i = 0;i < 4;i ++)
    {
        SegData[i] = DispData[i];
    }
    coding(SegData);
    start();          //start signal sent to TM1637 from MCU
    writeByte(ADDR_AUTO);//
    stop();           //
    start();          //
    writeByte(Cmd_SetAddr);//
    for(i=0;i < 4;i ++)
    {
        writeByte(SegData[i]);        //
    }
    stop();           //
    start();          //
    writeByte(Cmd_DispCtrl);//
    stop();           //
}


void TM1637::display(uint8_t BitAddr,int8_t DispData)
{
    int8_t SegData;
    SegData = coding(DispData);
    start();          //start signal sent to TM1637 from MCU
    writeByte(ADDR_FIXED);//
    stop();           //
    start();          //
    writeByte(BitAddr|0xc0);//
    writeByte(SegData);//
    stop();            //
    start();          //
    writeByte(Cmd_DispCtrl);//
    stop();           //
}

void TM1637::clearDisplay(void)
{
    display(0x00,0x7f);
    display(0x01,0x7f);
    display(0x02,0x7f);
    display(0x03,0x7f);
}

//To take effect the next time it displays.
void TM1637::set(uint8_t brightness,uint8_t SetData,uint8_t SetAddr)
{
    Cmd_SetData = SetData;
    Cmd_SetAddr = SetAddr;
    Cmd_DispCtrl = 0x88 + brightness;//Set the brightness and it takes effect the next time it displays.
}

//Whether to light the decimal point
//To take effect the next time it displays.
void TM1637::point(boolean PointFlag)
{
    _PointFlag = PointFlag;
}

void TM1637::coding(int8_t DispData[])
{
    uint8_t PointData;
    if( _PointFlag == POINT_ON ) {
	PointData = 0x80;
    } else {
	PointData = 0;
    }
    for(uint8_t i = 0;i < 4;i ++) {
        if( DispData[i] == 0x7f ) {
	    DispData[i] = 0x00;
	} else {
	    DispData[i] = digit[DispData[i]] + PointData;
	}
    }
}

int8_t TM1637::coding(int8_t DispData)
{
    uint8_t PointData;
    if( _PointFlag == POINT_ON ) {
	PointData = 0x80;
    } else {
	PointData = 0;
    }
    if( DispData == 0x7f ) {
	DispData = 0x00;
    } else {
	DispData = digit[DispData] + PointData;
    }
    return DispData;
}

void TM1637::bitDelay(void)
{
    delayMicroseconds(50);
}

// vim:si:sw=4
