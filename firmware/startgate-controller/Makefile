# Generic Project details
ARCHITECTURE = avr
BOARD_TAG = pro
BOARD_SUB = 8MHzatmega328

ifeq ($(OS), Windows_NT)

# Windows peculiarities
ARDUINO_DIR = D:/Arduino
ARDMK_DIR = D:/MichaelRommel/Software/Arduino-Makefile
MONITOR_PORT = com3
MONITOR_CMD = putty
MONITOR_PARAMS = 8,1,n,N
MONITOR_BAUDRATE = -b 57600

ARDUINO_PACKAGE_DIR := C:/Users/$(USER)/AppData/Local/Arduino15/packages
USER_LIB_PATH := D:/syncplicity/rommminw/Documents/Arduino/libraries

include D:/MichaelRommel/Software/Arduino-Makefile/Arduino.mk

else

# using screen
#MONITOR_PORT = /dev/tty.usbserial-AH02IXG1
#MONITOR_BAUDRATE  = 57600

# using picocom
MONITOR_CMD = PICOCOM
MONITOR_PORT = /dev/tty.usbserial-AH02IXG1
MONITOR_BAUDRATE = -b 57600

# using minicom
#MONITOR_CMD = minicom 
#FORCE_MONITOR_PORT = 1
#MONITOR_PORT = -D /dev/tty.usbserial-AH02IXG1
#MONITOR_BAUDRATE = -b 57600

ARDUINO_PACKAGE_DIR := $(HOME)/Library/Arduino15/packages
#USER_LIB_PATH := $(realpath /Volumes/Data/Software/michael/arduino/libraries/) 
USER_LIB_PATH = /Volumes/Data/Software/michael/arduino/libraries/
ARDUINO_LIBS = Wire ArduinoJson Adafruit_GFX Adafruit_SSD1306

include ../../../Arduino-Makefile-sudar/Arduino.mk

endif
