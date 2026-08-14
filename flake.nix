{
  description = "Mindprint — a family cognitive-style quiz (SvelteKit + SQLite)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      packages = forAllSystems (pkgs: rec {
        mindprint = pkgs.buildNpmPackage {
          pname = "mindprint";
          version = "1.0.0";
          src = ./.;

          # First build: leave as-is, run `nix build .#mindprint`, copy the
          # "got: sha256-…" hash from the error into this field.
          npmDepsHash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

          # better-sqlite3 compiles from source inside the sandbox (its
          # prebuilt-binary download is blocked); node-gyp needs python3.
          nativeBuildInputs = [ pkgs.python3 ];
          npm_config_build_from_source = "true";

          # @resvg/resvg-js ships its native binary as a platform-specific
          # optionalDependency; it is in package-lock.json, so the npm deps
          # fetcher picks it up automatically.

          installPhase = ''
            runHook preInstall
            mkdir -p $out/lib $out/bin
            cp -r build node_modules package.json fonts $out/lib/
            cat > $out/bin/mindprint <<EOF
            #!${pkgs.runtimeShell}
            cd $out/lib
            export FONT_DIR="$out/lib/fonts"
            exec ${pkgs.nodejs_22}/bin/node build/index.js
            EOF
            chmod +x $out/bin/mindprint
            runHook postInstall
          '';
        };
        default = mindprint;
      });

      nixosModules.default = { config, lib, pkgs, ... }:
        let
          cfg = config.services.mindprint;
        in
        {
          options.services.mindprint = {
            enable = lib.mkEnableOption "Mindprint quiz server";
            port = lib.mkOption {
              type = lib.types.port;
              default = 3000;
              description = "Port for the node server to listen on.";
            };
            origin = lib.mkOption {
              type = lib.types.str;
              example = "https://mindprint.example.com";
              description = "Public origin — used for share links and OG image URLs.";
            };
            package = lib.mkOption {
              type = lib.types.package;
              default = self.packages.${pkgs.system}.mindprint;
              description = "The Mindprint package to run.";
            };
            environmentFile = lib.mkOption {
              type = lib.types.nullOr lib.types.path;
              default = null;
              example = "/run/secrets/mindprint.env";
              description = ''
                EnvironmentFile with secrets, e.g. the LLM-narrative config:
                OPENAI_BASE_URL=https://api.example.com/v1
                OPENAI_API_KEY=sk-…
                OPENAI_MODEL=gpt-4o-mini
                Without OPENAI_API_KEY the narrative feature is silently disabled.
              '';
            };
          };

          config = lib.mkIf cfg.enable {
            systemd.services.mindprint = {
              description = "Mindprint quiz server";
              wantedBy = [ "multi-user.target" ];
              after = [ "network.target" ];
              environment = {
                PORT = toString cfg.port;
                ORIGIN = cfg.origin;
                DATA_DIR = "/var/lib/mindprint";
              };
              serviceConfig = {
                ExecStart = "${cfg.package}/bin/mindprint";
                EnvironmentFile = lib.mkIf (cfg.environmentFile != null) cfg.environmentFile;
                DynamicUser = true;
                StateDirectory = "mindprint";
                Restart = "on-failure";
                # hardening (nothing here needs more than the state dir)
                ProtectSystem = "strict";
                ProtectHome = true;
                PrivateTmp = true;
                NoNewPrivileges = true;
              };
            };
          };
        };
    };
}
