import { useState, useEffect } from 'react';
import { useAuth } from '@/components/Auth/AuthContext';
import Modal from '../UI/Modal'; 
import Button from '../UI/Button'; 
import Input from '../UI/Input'; 
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import styles from './LinkMinecraftModal.module.css';
import { NineSliceContainer } from '../UI'; 

interface LinkMinecraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface MojangProfile {
  id: string; 
  name: string; 
}

export function LinkMinecraftModal({ isOpen, onClose, onSuccess }: LinkMinecraftModalProps) {
  const { user, profile, updateProfile } = useAuth();
  const [minecraftUsername, setMinecraftUsername] = useState('');
  const [casedUsername, setCasedUsername] = useState<string | null>(null);
  const [uuid, setUuid] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); 
  const [isValidating, setIsValidating] = useState(false); 
  const [error, setError] = useState<string | null>(null); 
  const [validationError, setValidationError] = useState<string | null>(null); 
  const supabase = createClientComponentClient();

  // Effect to pre-fill data if account is already linked
  useEffect(() => {
    if (isOpen) {
      if (profile?.minecraft_username && profile?.minecraft_uuid) {
        const linkedUsername = profile.minecraft_username;
        const linkedUuid = profile.minecraft_uuid;

        setMinecraftUsername(linkedUsername);
        setCasedUsername(linkedUsername);
        setUuid(linkedUuid);
        // Use UUID for more reliable avatar fetching
        setAvatarUrl(`https://mc-heads.net/avatar/${linkedUuid}/64`); 
        setValidationError(null); // Clear validation error
        setError(null); // Clear general error
        setIsValidating(false); // Ensure not in validating state
      } else {
        // If modal opens and no account is linked, ensure fields are clear
        // (handleClose also does this, but good for explicit reset)
        setMinecraftUsername('');
        setCasedUsername(null);
        setUuid(null);
        setAvatarUrl(null);
        setValidationError(null);
        setError(null);
        setIsValidating(false);
      }
    }
  }, [isOpen, profile]); // Rerun when modal opens or profile changes

  const handleValidate = async () => {
    const trimmedUsername = minecraftUsername.trim();
    if (!trimmedUsername) {
      setValidationError('Please enter a Minecraft username.');
      setAvatarUrl(null);
      setCasedUsername(null);
      setUuid(null);
      return;
    }

    setIsValidating(true);
    setValidationError(null);
    setAvatarUrl(null);
    setCasedUsername(null);
    setUuid(null);
    setError(null); 

    try {
      // Add guard clause to ensure user is not null before accessing user.id
      if (!user) {
        throw new Error('User is not logged in.');
      }

      // Use the local proxy API route
      const proxyUrl = `/api/mojang/profile/${encodeURIComponent(trimmedUsername)}`;
      const mojangRes = await fetch(proxyUrl);

      if (!mojangRes.ok) {
        // Updated error handling for proxy response
        let errorMsg = `Couldn't verify username. Server error: ${mojangRes.status}`;
        try {
          const errorData = await mojangRes.json();
          // Use the error message from our proxy if available
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          // If parsing error JSON fails, use the status text or default message
          errorMsg = `Couldn't verify username: ${mojangRes.statusText || mojangRes.status}`;
        }
        console.error('Proxy API Error:', mojangRes.status, errorMsg);
        throw new Error(errorMsg); // Throw the error message we determined
      }

      const mojangProfile: MojangProfile | null = await mojangRes.json().catch(() => null);
      if (!mojangProfile || !mojangProfile.id || !mojangProfile.name) {
         throw new Error('Minecraft username not found.');
      }

      const correctUsername = mojangProfile.name;
      const userUUID = mojangProfile.id;

      const { data: existingProfile, error: supabaseCheckError } = await supabase
        .from('profiles')
        .select('id, minecraft_username') 
        .ilike('minecraft_username', correctUsername) 
        // Accessing user.id is now safe due to the check above
        .neq('id', user.id) 
        .maybeSingle(); 

      if (supabaseCheckError) {
        console.error('Supabase username check error:', supabaseCheckError);
        throw new Error('Error checking username availability. Please try again.');
      }

      if (existingProfile && existingProfile.minecraft_username?.toLowerCase() === correctUsername.toLowerCase()) {
        throw new Error(`Username "${correctUsername}" is already linked to another account.`);
      }

      setCasedUsername(correctUsername);
      setUuid(userUUID);
      setAvatarUrl(`https://mc-heads.net/avatar/${userUUID}/64`); 

    } catch (err: any) {
      console.error("Validation Error:", err);
      setValidationError(err.message || 'An unexpected error occurred during validation.');
      setAvatarUrl(null); 
      setCasedUsername(null);
      setUuid(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleLinkAccount = async () => {
    if (!casedUsername || !uuid || !user) {
      setError('Cannot link account. Please ensure the username is validated successfully.');
      return;
    }
    if (validationError) {
       setError('Cannot link account while there is a validation error.');
       return;
    }


    setIsLoading(true);
    setError(null);
    setValidationError(null); 

    try {
       await updateProfile({ minecraft_username: casedUsername, minecraft_uuid: uuid });
       console.log('Minecraft account linked successfully!');
       onSuccess();
       handleClose(); 
    } catch (err: any) {
        console.error('Error linking Minecraft account via AuthContext:', err);
        setError(err.message || 'Failed to link Minecraft account. Please try again.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleClose = () => {
    setMinecraftUsername('');
    setAvatarUrl(null);
    // Reset other relevant states on close
    setCasedUsername(null);
    setUuid(null);
    setValidationError(null);
    setError(null);
    setIsLoading(false);
    setIsValidating(false);
    onClose(); // Call the parent's onClose handler
  };

  useEffect(() => {
    if (!isOpen) return;

    if (!minecraftUsername.trim()) {
        setValidationError(null);
        setAvatarUrl(null);
        setCasedUsername(null);
        setUuid(null);
        setError(null); 
        setIsValidating(false); 
        return; 
    }

    const handler = setTimeout(() => {
      handleValidate();
    }, 600); 

    return () => {
      clearTimeout(handler);
    };
  }, [minecraftUsername, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Link Minecraft Account">
      <div className={styles.modalBodyContent}> 
        <NineSliceContainer className={styles.modalContentPadding}>
          <p className={styles.instructions}>
            Enter your Minecraft username. We&apos;ll check if it&apos;s valid and available.
          </p>
          <div className={styles.inputGroup}>
            <Input
              label="Minecraft Username"
              id="minecraft-username"
              value={minecraftUsername}
              onChange={(e) => setMinecraftUsername(e.target.value)}
              placeholder="e.g., Notch"
              disabled={isLoading} 
              className={styles.usernameInput}
              aria-describedby="validation-status validation-error-message" 
              aria-invalid={!!validationError} 
              autoComplete="off" 
            />
            <div className={styles.avatarPreview} id="validation-status" aria-live="polite">
              {isValidating && <div className={styles.avatarPlaceholder}>Checking...</div>}

              {!isValidating && avatarUrl && casedUsername && !validationError && (
                <NineSliceContainer  className={styles.avatarContainer}>
                  <Image
                    key={avatarUrl} 
                    src={avatarUrl}
                    alt={`${casedUsername}'s avatar`}
                    width={64}
                    height={64}
                    className={styles.avatarImage}
                    unoptimized 
                    priority 
                  />
                   <span className={styles.validatedUsername}>{casedUsername}</span>
                </NineSliceContainer>
              )}

              {!isValidating && !avatarUrl && !validationError && (!minecraftUsername.trim() || (minecraftUsername.trim() && !casedUsername)) && (
                 <div className={styles.avatarPlaceholder}>Enter username</div>
              )}

              {!isValidating && validationError && (
                 <div className={`${styles.avatarPlaceholder} ${styles.avatarErrorPlaceholder}`}>Error</div>
              )}
            </div>
          </div>
           {validationError && <p id="validation-error-message" className={styles.errorMessage} role="alert">{validationError}</p>}
           {error && !validationError && <p className={styles.errorMessage} role="alert">{error}</p>}
        </NineSliceContainer>
      </div>
      <div className={styles.modalFooterContent}> 
         <Button
          onClick={handleClose}
          variant="secondary"
          disabled={isLoading} 
          className={styles.button}
          >
          Cancel
        </Button>
        <Button
          onClick={handleLinkAccount}
          disabled={isLoading || isValidating || !!validationError || !casedUsername || !uuid}
          className={styles.button}
          aria-disabled={isLoading || isValidating || !!validationError || !casedUsername || !uuid}
        >
          {isLoading ? 'Linking...' : 'Link Account'}
        </Button>
      </div>
    </Modal>
  );
}