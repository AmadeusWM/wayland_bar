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
    >
        <icon icon={bind(bat, "batteryIconName")} />
        {/* <label label={bind(bat, "percentage").as(p =>
            `${Math.floor(p * 100)}%`
        )} /> */}
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

type MmcliOutput = {
    modem: {
        "3gpp": {
            "5gnr": {
                "registration-settings": {
                    "drx-cycle": string;
                    "mico-mode": string;
                };
            };
            "enabled-locks": string[];
            "eps": {
                "initial-bearer": {
                    "dbus-path": string;
                    "settings": {
                        apn: string;
                        "ip-type": string;
                        password: string;
                        user: string;
                    };
                };
                "ue-mode-operation": string;
            };
            imei: string;
            "operator-code": string;
            "operator-name": string;
            "packet-service-state": string;
            pco: string;
            "registration-state": string;
        };
        cdma: {
            "activation-state": string;
            "cdma1x-registration-state": string;
            esn: string;
            "evdo-registration-state": string;
            meid: string;
            nid: string;
            sid: string;
        };
        "dbus-path": string;
        generic: {
            "access-technologies": string[];
            bearers: string[];
            "carrier-configuration": string;
            "carrier-configuration-revision": string;
            "current-bands": string[];
            "current-capabilities": string[];
            "current-modes": string;
            device: string;
            "device-identifier": string;
            drivers: string[];
            "equipment-identifier": string;
            "hardware-revision": string;
            manufacturer: string;
            model: string;
            "own-numbers": string[];
            physdev: string;
            plugin: string;
            ports: string[];
            "power-state": string;
            "primary-port": string;
            "primary-sim-slot": string;
            revision: string;
            "signal-quality": {
                recent: string;
                value: string;
            };
            sim: string;
            "sim-slots": string[];
            state: string;
            "state-failed-reason": string;
            "supported-bands": string[];
            "supported-capabilities": string[];
            "supported-ip-families": string[];
            "supported-modes": string[];
            "unlock-required": string;
            "unlock-retries": string[];
        };
    };
};

function SignalStrength() {
  const signal = Variable<MmcliOutput | null>(null).poll(5000, () => {
      try {
        const modemListOutput = GLib.spawn_command_line_sync("mmcli -L --output-json")[1];
        if (!modemListOutput) {
          return null;
        }
        const modemListString = new TextDecoder().decode(modemListOutput);
        const modemListJson = JSON.parse(modemListString);
        const modemId = modemListJson["modem-list"][0].split("/").pop();

        const output = GLib.spawn_command_line_sync(`mmcli --output-json -m ${modemId}`)[1];
        if (!output) {
          return null;
        }
        const outputString = new TextDecoder().decode(output);
        const mmcliOutput: MmcliOutput = JSON.parse(outputString);
        return mmcliOutput;
      } catch (e) {
          console.error("Failed to fetch signal strength:", e);
          return null;
      }
  });

  return <box className="SignalStrength" visible={bind(signal).as(signal => signal?.modem?.generic?.state === "connected")}>
      {bind(signal).as(signal => {
          if (!signal || signal.modem.generic.state !== "connected") {
              return null;
          }
          const signalValue = parseInt(signal.modem.generic["signal-quality"].value, 10);
          let iconName = "network-cellular";
          if (signalValue >= 75) {
              iconName = "network-cellular-signal-excellent-symbolic";
          } else if (signalValue >= 50) {
              iconName = "network-cellular-signal-good-symbolic";
          } else if (signalValue >= 25) {
              iconName = "network-cellular-signal-ok-symbolic";
          } else if (signalValue > 0) {
              iconName = "network-cellular-signal-weak-symbolic";
          } else {
              iconName = "network-cellular-signal-none-symbolic";
          }
          return <icon icon={iconName} />
      })}
  </box>
}

function RamUsage() {
    const ramUsage = Variable<number>(0).poll(1000, () => {
        const memInfo = GLib.file_get_contents("/proc/meminfo")[1];
        if (!memInfo) {
            return 0;
        }
        const memInfoString = new TextDecoder().decode(memInfo);
        const lines = memInfoString.split("\n");
        const memTotal = parseInt(lines.find(line => line.startsWith("MemTotal:"))?.split(/\s+/)[1] || "0", 10);
        const memAvailable = parseInt(lines.find(line => line.startsWith("MemAvailable:"))?.split(/\s+/)[1] || "0", 10);
        return ((memTotal - memAvailable) / memTotal) * 100;
    });

    return <box className="RamUsage">
        {bind(ramUsage).as(usage => {
            const percentage = Math.round(usage);
            return <circularprogress
                value={percentage / 100}
                className="RamUsageCircularProgress"
            >
            </circularprogress>;
        })}
    </box>
}

function CpuUsage() {
    const cpuUsage = Variable<{ usage: number; previousIdleTime: number; previousTotalTime: number }>({
        usage: 0,
        previousIdleTime: 0,
        previousTotalTime: 0,
    }).poll(1000, (prev) => {
        const statInfo = GLib.file_get_contents("/proc/stat")[1];
        if (!statInfo) {
            return { ...prev, usage: 0 };
        }
        const statInfoString = new TextDecoder().decode(statInfo);
        const lines = statInfoString.split("\n");
        const cpuLine = lines.find(line => line.startsWith("cpu "));
        if (!cpuLine) {
            return { ...prev, usage: 0 };
        }
        const cpuTimes = cpuLine.split(/\s+/).slice(1).map(Number);
        const idleTime = cpuTimes[3];
        const totalTime = cpuTimes.reduce((acc, time) => acc + time, 0);

        const idleDelta = idleTime - prev.previousIdleTime;
        const totalDelta = totalTime - prev.previousTotalTime;

        const usage = totalDelta > 0 ? ((totalDelta - idleDelta) / totalDelta) * 100 : 0;

        return {
            usage,
            previousIdleTime: idleTime,
            previousTotalTime: totalTime,
        };
    });

    return <box className="CpuUsage">
        {bind(cpuUsage).as(usage => {
            const percentage = Math.round(usage.usage);
            return <circularprogress
                value={percentage / 100}
                className="CpuUsageCircularProgress"
            >
            </circularprogress>;
        })}
    </box>
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
              <box className="Stats">
                  <RamUsage/>
                  <CpuUsage/>
              </box>
              <Workspaces forMonitor={monitor} showInactiveIcons></Workspaces>
            </box>
            <box hexpand >
              <Time />
            </box>
            <box
              hexpand
              halign={Gtk.Align.END}
              // spacing={4}

            >
              <PowerProfileSelector/>
              <button
                className="Tools"
                onClick={() => GLib.spawn_command_line_async("env XDG_CURRENT_DESKTOP=GNOME gnome-control-center wifi")}
              >
                <box
                  spacing={8}
                >
                  <Wifi />
                  <SignalStrength/>
                  <AudioSlider />
                  <BatteryLevel />
                </box>
              </button>
            </box>
        </centerbox>
    </window>
}
