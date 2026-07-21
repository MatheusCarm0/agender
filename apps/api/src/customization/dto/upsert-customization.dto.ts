import { IsOptional, IsString, IsObject, IsArray, IsBoolean } from 'class-validator';

export class UpsertCustomizationDto {
  @IsObject()
  theme!: {
    palette: 'ocean' | 'sand' | 'forest' | 'mono' | 'sunset' | 'midnight' | 'elegant' | 'custom';
    colors: { background: string; surface: string; primary: string; text: string };
    font: 'inter' | 'poppins' | 'playfair' | 'dmSans' | 'montserrat' | 'raleway' | 'lora' | 'nunito' | 'spaceGrotesk' | 'cormorant';
    background: {
      type: 'solid' | 'gradient' | 'image';
      value: string;
      gradient?: { from: string; to: string; direction: string };
    };
    logoUrl?: string;
    coverUrl?: string;
    buttonStyle: 'rounded' | 'pill' | 'square';
    layout: 'list' | 'cards';
    overlayOpacity?: number;
    backgroundEffect?: 'none' | 'dots' | 'grid' | 'noise' | 'animated-gradient';
    containerStyle?: 'solid' | 'glass' | 'frosted';
  };

  @IsOptional()
  @IsArray()
  links?: { label: string; url: string; icon?: string; thumbnailUrl?: string; style?: string; type?: 'link' | 'heading' | 'divider' | 'text' | 'spacer' }[];

  @IsOptional()
  @IsObject()
  socials?: { instagram?: string; whatsapp?: string; facebook?: string; tiktok?: string };

  @IsOptional()
  @IsString()
  headline?: string;

  @IsOptional()
  @IsString()
  about?: string;

  @IsOptional()
  @IsString()
  welcomeMsg?: string;

  @IsOptional()
  @IsObject()
  address?: { street?: string; city?: string; state?: string; zip?: string };

  @IsOptional()
  @IsArray()
  gallery?: string[];

  @IsOptional()
  @IsBoolean()
  showHours?: boolean;

  @IsOptional()
  @IsString()
  faviconUrl?: string;
}
