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
#MONITOR_PORT = /dev/tty.usbserial-A50285BI
#MONITOR_BAUDRATE  = 57600

# using picocom
MONITOR_CMD = PICOCOM
MONITOR_PORT = /dev/tty.usbserial-A50285BI
MONITOR_BAUDRATE = -b 57600

# using minicom
#MONITOR_CMD = minicom 
#FORCE_MONITOR_PORT = 1
#MONITOR_PORT = -D /dev/tty.usbserial-A50285BI
#MONITOR_BAUDRATE = -b 57600

include /usr/local/opt/arduino-mk/Arduino.mk

endif
