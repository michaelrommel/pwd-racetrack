BOARD_TAG = pro
BOARD_SUB = 8MHzatmega328
ARCHITECTURE = avr

#SERIALDEV = /dev/tty.usbserial-A50285BI

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

# AVRDUDECONF := "/Applications/Arduino.app/Contents/Java/hardware/tools/avr/etc/avrdude.conf"

# Define Arduino support package installation path where SAM device support has been installed
# # Linux
# #ARDUINO_PACKAGE_DIR := $(HOME)/.arduino15/packages
# # macOS
# #ARDUINO_PACKAGE_DIR := $(HOME)/Library/Arduino15/packages
# # Windows
# #ARDUINO_PACKAGE_DIR := "C:/Users/$(USER)/AppData/Local/Arduino15/packages"
#
# include ../../Sam.mk

include /usr/local/opt/arduino-mk/Arduino.mk
