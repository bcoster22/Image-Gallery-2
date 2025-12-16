            # Auto-switch model if requested and different
            if requested_model and requested_model != current_model:
                import sys
                available_models = list(self.manifest_manager.get_models().keys())
                sys.stderr.write(f"DEBUG: Switch requested. From: '{current_model}' To: '{requested_model}'\n")
                sys.stderr.write(f"DEBUG: requested_model type: {type(requested_model)}, repr: {repr(requested_model)}\n")
                
                is_in = requested_model in self.manifest_manager.get_models()
                sys.stderr.write(f"DEBUG: In manifest check result: {is_in}\n")

                if is_in:
                    sys.stderr.write(f"Auto-switching to requested model: {requested_model}\n")
                    
                    # Unload SDXL if present (Zombie Prevention)
                    if sdxl_backend_new:
                        try:
                            sdxl_backend_new.unload_backend()
                            print("[ZombiePrevention] Unloaded SDXL before switch")
                        except: pass

                    if self.inference_service.restart(requested_model):
                         self.config.set("current_model", requested_model)
                         
                         # TRACKER UPDATE
                         try:
                             if current_model and current_model != requested_model:
                                 model_memory_tracker.track_model_unload(current_model)
                             
                             model_info = self.manifest_manager.get_models().get(requested_model)
                             if model_info:
                                 model_memory_tracker.track_model_load(requested_model, model_info.name)
                         except Exception as e:
                             print(f"Warning: Failed to track switch: {e}")
                    else:
                        raise HTTPException(status_code=500, detail=f"Failed to switch to model {requested_model}")
                else:
                    sys.stderr.write(f"DEBUG: Requested model '{requested_model}' NOT FOUND in manifest.\n")
                    pass
