{
  description = "A Nix-flake-based Development Environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    astal = {
      url = "github:aylur/astal";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    ags = {
      url = "github:aylur/ags";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, astal, ags }:
    let
      supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forEachSupportedSystem = f: nixpkgs.lib.genAttrs supportedSystems (system: f rec {
        pkgs = import nixpkgs { inherit system; };
        extraPackages = with astal.packages.${pkgs.system}; [
          # cherry pick packages
          astal3
          io
          battery
          mpris
          battery
          wireplumber
          network
          tray
          powerprofiles
        ];
      });
    in
    {
      devShells = forEachSupportedSystem ({ pkgs, extraPackages }: {
        default = pkgs.mkShell {
        buildInputs = [
            # includes astal3 astal4 astal-io by default
            (ags.packages.${pkgs.system}.default.override {
              extraPackages = extraPackages;
            })
          ];
        };
      });
      packages = forEachSupportedSystem ({ pkgs, extraPackages }: {
        default = ags.lib.bundle {
            inherit pkgs;
            src = ./.;
            name = "wayland_bar"; # name of executable
            entry = "app.ts";
            gtk4 = false;

            # additional libraries and executables to add to gjs' runtime
            extraPackages = extraPackages;
        };
      });
    };
}
