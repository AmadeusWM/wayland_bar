import { Variable, GLib, bind } from "astal"
import { Astal, Gtk, Gdk } from "astal/gtk3"
import Mpris from "gi://AstalMpris"
import Battery from "gi://AstalBattery"
import Wp from "gi://AstalWp"
import Network from "gi://AstalNetwork"
import Tray from "gi://AstalTray"
import PowerProfiles from "gi://AstalPowerProfiles"
import Niri from "../libraries/niri"
import Workspaces from "./Workspaces"

function Wifi() {
    const network = Network.get_default()
    const wifi = bind(network, "wifi")
    return <box visible={wifi.as(Boolean)}>
      {wifi.as(wifi => wifi && (
        <icon
          className="Wifi"
          icon={bind(wifi, "iconName")} />
      ))}
    </box>
}

function AudioSlider() {
    const speaker = Wp.get_default()?.audio.default_speaker!

    return <box className="AudioSlider">
        <icon icon={bind(speaker, "volumeIcon")} />
        {/* <slider
            hexpand
            onChangeValue={({ value }) => speaker.set_volume(value)}
            value={bind(speaker, "volume")}
        /> */}
    </box>
}

function BatteryLevel() {
    const bat = Battery.get_default()

    return <box className="Battery"
      visible={bind(bat, "isPresent")}
      spacing={3}
    >
        <icon icon={bind(bat, "batteryIconName")} />
        <label label={bind(bat, "percentage").as(p =>
            `${Math.floor(p * 100)}%`
        )} />
    </box>
}

function Time({ format = "%H:%M - %B %e" }) {
    const time = Variable<string>("").poll(1000, () =>
        GLib.DateTime.new_now_local().format(format)!)

    return <label
        className="Time"
        onDestroy={() => time.drop()}
        label={time()}
    />
}

function PowerProfileSelector() {
    const powerprofiles = PowerProfiles.get_default()
    const activeProfile = bind(powerprofiles, "activeProfile")
    const availableProfiles = powerprofiles.get_profiles()

      return <button
        onClick={() => {
            const currentIndex = availableProfiles.findIndex(profile => profile.profile === activeProfile.get());
            const nextIndex = (currentIndex + 1) % availableProfiles.length;
            powerprofiles.set_active_profile(availableProfiles[nextIndex].profile);
        }}>
          <icon
              icon={bind(powerprofiles, "iconName")}
          />
        </button>
}

export default function Bar(monitor: Gdk.Monitor) {
    const { TOP, LEFT, RIGHT } = Astal.WindowAnchor

    return <window
      visible
      className="Bar"
        gdkmonitor={monitor}
        exclusivity={Astal.Exclusivity.EXCLUSIVE}
        anchor={TOP | LEFT | RIGHT}>
        <centerbox>
            <box hexpand halign={Gtk.Align.START}>
              <Workspaces forMonitor={monitor} showInactiveIcons></Workspaces>
            </box>
            <box hexpand >
              <Time />
            </box>
            <box hexpand halign={Gtk.Align.END} >
              <PowerProfileSelector/>
              <button
                className="Tools"
                onClick={() => GLib.spawn_command_line_async("env XDG_CURRENT_DESKTOP=GNOME gnome-control-center wifi")}
              >
                <box
                  spacing={3}
                >
                  <Wifi />
                  <AudioSlider />
                  <BatteryLevel />
                </box>
              </button>
            </box>
        </centerbox>
    </window>
}
