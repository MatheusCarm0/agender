import { IsOptional, IsString, IsObject, IsArray } from 'class-validator';

export class UpsertCustomizationDto {
  @IsObject()
  theme!: {
    palette: 'ocean' | 'sand' | 'forest' | 'mono' | 'custom';
    colors: { background: string; surface: string; primary: string; text: string };
    font: 'inter' | 'poppins' | 'playfair' | 'dmSans';
    background: { type: 'solid' | 'gradient' | 'image'; value: string };
    logoUrl?: string;
    coverUrl?: string;
    buttonStyle: 'rounded' | 'pill' | 'square';
    layout: 'list' | 'cards';
  };

  @IsOptional()
  @IsArray()
  links?: { label: string; url: string; icon?: string }[];

  @IsOptional()
  @IsObject()
  socials?: { instagram?: string; whatsapp?: string; facebook?: string; tiktok?: string };

  @IsOptional()
  @IsString()
  headline?: string;

  @IsOptional()
  @IsString()
  about?: string;
}
