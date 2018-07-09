# Generic Project details
ARCHITECTURE = avr
# use make show_boards and make show_submenu for lists
BOARD_TAG = mega
BOARD_SUB = atmega2560
#BOARD_TAG = pro
#BOARD_SUB = 8MHzatmega328

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

# using picocom
MONITOR_CMD = PICOCOM
MONITOR_PORT = /dev/cu.usbserial-AD01W5DU
MONITOR_BAUDRATE = -b 57600

ARDUINO_PACKAGE_DIR := $(HOME)/Library/Arduino15/packages
ARDUINO_LIBS = SPI Wire ArduinoJson U8g2 MFRC522

include ../../../Arduino-Makefile-sudar/Arduino.mk

endif
