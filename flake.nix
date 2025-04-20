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
      forEachSupportedSystem = f: nixpkgs.lib.genAttrs supportedSystems (system: f {
        pkgs = import nixpkgs { inherit system; };
      });
    in
    {
      devShells = forEachSupportedSystem ({ pkgs }: {
        default = pkgs.mkShell {
        buildInputs = [
            # includes astal3 astal4 astal-io by default
            (ags.packages.${pkgs.system}.default.override {
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
            })
          ];
        };
      });
    };
}
