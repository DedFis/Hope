"use client";

import * as z from "zod";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { useOrganization } from "@clerk/nextjs";
import { ChangeEvent, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname, useRouter } from "next/navigation";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { useUploadThing } from "@/lib/uploadthing";
import { isBase64Image } from "@/lib/utils";

import { ThreadValidation } from "@/lib/validations/thread";
import { createThread } from "@/lib/actions/thread.actions";

interface Props {
  userId: string;
}

function PostThread({ userId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { startUpload } = useUploadThing("media");

  const [files, setFiles] = useState<File[]>([]);

  const { organization } = useOrganization();

  const form = useForm<z.infer<typeof ThreadValidation>>({
    resolver: zodResolver(ThreadValidation),
    defaultValues: {
      thread: "",
      accountId: userId,
      image: [],
    },
  });

  const handleImage = (
    e: ChangeEvent<HTMLInputElement>,
    fieldChange: (value: string[]) => void
  ) => {
    e.preventDefault();

    

    // if (e.target.files && e.target.files.length > 0) {
    //   const file = e.target.files[0];
    //   setFiles(Array.from(e.target.files));

    //   if (!file.type.includes("image")) return;

    //   fileReader.onload = async (event) => {
    //     const imageDataUrl = event.target?.result?.toString() || "";
    //     fieldChange(imageDataUrl);
    //   };

    //   fileReader.readAsDataURL(file);
    // }

    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setFiles(files);

      const promises = files.map((file) => {
        return new Promise<string>((resolve, reject) => {
          const fileReader = new FileReader();

          if (!file.type.includes("image")) return reject("Invalid file type.");

          fileReader.onload = async (event) => {
            const imageDataUrl = event.target?.result?.toString() || "";
            resolve(imageDataUrl);
          };

          fileReader.onerror = (error) => reject(error);
          fileReader.readAsDataURL(file);
        })
      });

      Promise.all( promises ).then(( imageDataUrls ) => {
        fieldChange(imageDataUrls);
      }).catch(( error ) => console.log("Error loading images.",error));
    }
  };

  const onSubmit = async (values: z.infer<typeof ThreadValidation>) => {
    const temp: string[] = [];

    // files.map(async (file) => {
    //   console.log(file);
    //   const imgRes = await startUpload(file);
    //   console.log(imgRes);

    //   if (imgRes && imgRes[0].fileUrl) {
    //     temp.push(imgRes[0].fileUrl);
    //     console.log(imgRes[0].fileUrl);
    //   }
    // })

    for (const file of files) {
      if (file) {
        try {
          const imgRes = await startUpload([file]);

          if (imgRes && imgRes.length > 0 && imgRes[0].fileUrl) {
            temp.push(imgRes[0].fileUrl);
          }
        } catch (error) {
          console.error("Error uploading image : ", error);
        }
      }
    }

    console.log(temp)


    await createThread({
      text: values.thread,
      image: temp,
      author: userId,
      communityId: organization ? organization.id : null,
      path: pathname,
    });

    router.push("/");
  };

  const handleRemoveImage = (index: number, currentImages: string[], fieldChange: (value: string[]) => void) => {
    const updatedImages = currentImages.filter((_, i) => i !== index);
    fieldChange(updatedImages);
  };

  return (
    <Form {...form}>
      <form
        className='mt-10 flex flex-col justify-start gap-10'
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name='thread'
          render={({ field }) => (
            <FormItem className='flex w-full flex-col gap-3'>
              <FormLabel className='text-base-semibold text-light-2'>
                Content
              </FormLabel>
              <FormControl className='no-focus border border-dark-4 bg-dark-3 text-light-1'>
                <Textarea rows={15} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='image'
          render={({ field }) => (
            <FormItem className='flex flex-wrap items-center gap-4'>
              <FormLabel className='account-form_image-label'>
                {field.value && field.value.length > 0 ? (
                  field.value.map((imgSrc, index) => (
                    <div key={index} className="relative">
                      <Image
                        key={index}
                        src={imgSrc}
                        alt={`selected_image_${index}`}
                        width={96}
                        height={96}
                        priority
                        className='rounded-full object-contain'
                      />
                      <button type="button" onClick={() => handleRemoveImage(index, field.value, field.onChange)} className="absolute top-0 right-0 text-red-600">
                        X
                      </button>
                    </div>
                  ))
                ): (
                  <Image
                    src='/assets/profile.svg'
                    alt='default_image'
                    width={24}
                    height={24}
                    className='object-contain'
                  />
                )}

              </FormLabel>
              <FormControl className='flex-1 text-base-semibold text-gray-200'>
                <Input
                  type='file'
                  accept='image/*'
                  multiple
                  placeholder='Add report photo'
                  className='account-form_image-input'
                  onChange={(e) => handleImage(e, field.onChange)}
                />
              </FormControl>

              <button type="button" onClick={() => document.getElementById('image-input')?.click()} className="px-4 py-2 bg-blue-500 text-white rounded-md">
                Add More Images
              </button>
            </FormItem>
          )}
        />

        <Button type='submit' className='bg-primary-500'>
          Post Thread
        </Button>
      </form>
    </Form>
  );
}

export default PostThread;
