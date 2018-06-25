# Project details
ARCHITECTURE = sam
BOARD_TAG = arduino_due_x

ifeq ($(CURRENT_OS), Windows)

# Windows peculiarities
ARDUINO_DIR = D:/Arduino
ARDMK_DIR = D:/MichaelRommel/Software/Arduino-Makefile
MONITOR_PORT = com3
MONITOR_CMD = putty
MONITOR_PARAMS = 8,1,n,N
MONITOR_BAUDRATE = -b 57600

# Define Arduino support package installation path where SAM device support has been installed
# # Linux
# #ARDUINO_PACKAGE_DIR := $(HOME)/.arduino15/packages
# # macOS
# #ARDUINO_PACKAGE_DIR := $(HOME)/Library/Arduino15/packages
# # Windows
ARDUINO_PACKAGE_DIR := C:/Users/$(USER)/AppData/Local/Arduino15/packages
#USER_LIB_PATH := C:/Users/rommminw/AppData/Local/Arduino15/packages/arduino/hardware/sam/1.6.11/system/libsam
#USER_INCLUDES := C:/Users/rommminw/AppData/Local/Arduino15/packages/arduino/hardware/sam/1.6.11/system/libsam

include D:/MichaelRommel/Software/Arduino-Makefile/Sam.mk

else

# using screen
#MONITOR_PORT = /dev/tty.usbserial-A50285BI
#MONITOR_BAUDRATE  = 57600

# using picocom
MONITOR_CMD = PICOCOM
#MONITOR_PORT = /dev/cu.usbmodemFA2321
MONITOR_PORT = /dev/cu.usbmodemFA2311
#MONITOR_PORT = /dev/cu.usbmodem5D11
MONITOR_BAUDRATE = -b 57600
#MONITOR_BAUDRATE = -b 9600

# using minicom
#MONITOR_CMD = minicom 
#FORCE_MONITOR_PORT = 1
#MONITOR_PORT = -D /dev/tty.usbserial-A50285BI
#MONITOR_BAUDRATE = -b 57600

ARDUINO_PACKAGE_DIR := $(HOME)/Library/Arduino15/packages
USER_LIB_PATH := $(realpath /Volumes/Data/Software/michael/arduino/libraries/)

#include /usr/local/opt/arduino-mk/Sam.mk
include ../../../Arduino-Makefile-sudar/Sam.mk

endif
