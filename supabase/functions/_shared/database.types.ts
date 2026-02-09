export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      children: {
        Row: {
          id: string
          parent_user_id: string
          password: string | null
        }
        Update: {
          password?: string | null
        }
      }
    }
    Functions: {
      verify_child_password_secure: {
        Args: { p_child_id: string; p_password: string }
        Returns: boolean
      }
      set_child_password_secure: {
        Args: { p_child_id: string; p_password: string | null }
        Returns: boolean
      }
    }
  }
}
